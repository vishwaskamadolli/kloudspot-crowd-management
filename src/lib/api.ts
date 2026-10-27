import type { CrowdEntry, Overview, Paginated, Site } from "../types";

const env = import.meta.env;
const inFlight = new Map<string, Promise<unknown>>();
let sitesPromise: Promise<Site[]> | undefined;
const required = (key: keyof ImportMetaEnv) => {
  const value = env[key];
  if (!value) throw new Error(`Missing configuration: ${key}`);
  return value;
};
const tokenKey = "kloudspot_access_token";
export const authStore = {
  get: () => localStorage.getItem(tokenKey),
  set: (token: string) => {
    sitesPromise = undefined;
    localStorage.setItem(tokenKey, token);
  },
  clear: () => {
    sitesPromise = undefined;
    localStorage.removeItem(tokenKey);
  },
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base =
    env.VITE_API_BASE_URL || "https://hiring-dev.internal.kloudspot.com";
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const token = authStore.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const key = `${init?.method ?? "GET"}:${path}:${init?.body ?? ""}:${token ?? ""}`;
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;
  const operation = (async () => {
    const response = await fetch(new URL(path, base), { ...init, headers });
    if (response.status === 401) {
      authStore.clear();
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as {
        errorMessage?: string;
        message?: string;
      } | null;
      throw new Error(
        error?.errorMessage || error?.message || `Request failed (${response.status})`,
      );
    }
    return response.json() as Promise<T>;
  })();
  inFlight.set(key, operation);
  try {
    return await operation;
  } finally {
    inFlight.delete(key);
  }
}

export async function login(email: string, password: string) {
  const body = await request<{ token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!body.token)
    throw new Error("Login response did not contain a JWT token");
  authStore.set(body.token);
  return body.token;
}
const analytics = (
  path: string,
  siteId: string,
  fromUtc: number,
  toUtc: number,
  extra?: object,
) =>
  request<unknown>(path, {
    method: "POST",
    body: JSON.stringify({ siteId, fromUtc, toUtc, ...extra }),
  });
const utcMillis = (value: number | string) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric))
    return numeric > 0 && numeric < 1e12 ? numeric * 1000 : numeric;
  return typeof value === "string" ? Date.parse(value) : Number.NaN;
};
export const getSites = () =>
  (sitesPromise ??= request<Site[]>("/api/sites").catch((error) => {
    sitesPromise = undefined;
    throw error;
  }));
export async function getOverview(
  siteId: string,
  fromUtc: number,
  toUtc: number,
): Promise<Overview> {
  const [footfall, dwell, occupancy, demographics] = await Promise.all([
    analytics("/api/analytics/footfall", siteId, fromUtc, toUtc) as Promise<{
      footfall: number;
    }>,
    analytics("/api/analytics/dwell", siteId, fromUtc, toUtc) as Promise<{
      avgDwellMinutes: number;
      dwellRecords: number;
    }>,
    analytics("/api/analytics/occupancy", siteId, fromUtc, toUtc),
    analytics("/api/analytics/demographics", siteId, fromUtc, toUtc),
  ]);
  type OccupancyBucket = {
    utc: number | string;
    local: string;
    avg: number | string;
  };
  type DemographicBucket = {
    utc: number | string;
    local: string;
    male: number | string;
    female: number | string;
  };
  const occupancyResponse = occupancy as {
    buckets?: OccupancyBucket[];
    occupancy?: { buckets?: OccupancyBucket[] };
  };
  const demographicsResponse = demographics as {
    buckets?: DemographicBucket[];
    demographics?: { buckets?: DemographicBucket[] };
  };
  const occupancyBuckets =
    occupancyResponse.buckets ?? occupancyResponse.occupancy?.buckets ?? [];
  const demographicBuckets =
    demographicsResponse.buckets ??
    demographicsResponse.demographics?.buckets ??
    [];
  const trend = occupancyBuckets
    .map((bucket) => ({
      timestamp: utcMillis(bucket.utc),
      occupancy: Number(bucket.avg),
    }))
    .filter(
      (bucket) =>
        Number.isFinite(bucket.timestamp) && Number.isFinite(bucket.occupancy),
    )
    .sort((left, right) => left.timestamp - right.timestamp);
  const demographicTrend = demographicBuckets
    .map((bucket) => ({
      timestamp: utcMillis(bucket.utc),
      male: Number(bucket.male),
      female: Number(bucket.female),
    }))
    .filter(
      (bucket) =>
        Number.isFinite(bucket.timestamp) &&
        Number.isFinite(bucket.male) &&
        Number.isFinite(bucket.female),
    )
    .sort((left, right) => left.timestamp - right.timestamp);
  const latest = [...demographicTrend]
    .reverse()
    .find((bucket) => bucket.male + bucket.female > 0);
  return {
    footfall: footfall.footfall,
    averageDwellMinutes: dwell.avgDwellMinutes,
    trend,
    demographicTrend,
    gender: latest
      ? [
          { label: "Male", value: latest.male },
          { label: "Female", value: latest.female },
        ]
      : [],
    alerts: [],
  };
}
type EntryExitResponse = {
  totalRecords: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  records: {
    personId: string;
    personName: string;
      gender?: string;
    zoneId: string;
    zoneName: string;
    severity: string;
    entryUtc: number;
    entryLocal: string;
    exitUtc: number | null;
    exitLocal: string | null;
    dwellMinutes: number | null;
  }[];
};
export async function getEntries(
  siteId: string,
  fromUtc: number,
  toUtc: number,
  pageNumber: number,
  pageSize = 50,
): Promise<Paginated<CrowdEntry>> {
  const data = (await analytics(
    "/api/analytics/entry-exit",
    siteId,
    fromUtc,
    toUtc,
    { pageSize, pageNumber },
  )) as EntryExitResponse;
  return {
    items: data.records.map((record, index) => ({
      id: `${record.personId}-${record.entryUtc}-${index}`,
      visitorId: record.personId,
      name: record.personName,
        gender: record.gender,
        severity: record.severity,
      entryTime: record.entryUtc,
      exitTime: record.exitUtc ?? undefined,
      dwellMinutes: record.dwellMinutes ?? undefined,
      zone: record.zoneName,
    })),
    page: data.pageNumber,
    pageSize: data.pageSize,
    total: data.totalRecords,
  };
}
export const startSimulation = () => request<unknown>("/api/sim/start");
export const stopSimulation = () => request<unknown>("/api/sim/stop");
export { required };
