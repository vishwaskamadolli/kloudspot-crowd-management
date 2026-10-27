import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DateRange, type Range } from "../components/DateRange";
import { SiteSelect } from "../components/SiteSelect";
import { EmptyState, EntriesSkeleton, ErrorState } from "../components/States";
import { useAsync } from "../hooks/useAsync";
import { getEntries, getSites } from "../lib/api";
import { duration, formatTime, siteRangeToUtc } from "../lib/format";
const today = format(new Date(), "yyyy-MM-dd");
export function Entries() {
  const [range, setRange] = useState<Range>({ from: today, to: today });
  const [siteId, setSiteId] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 50;
  const sites = useAsync(getSites, []);
  useEffect(() => {
    if (!siteId && sites.data?.[0]) setSiteId(sites.data[0].siteId);
  }, [siteId, sites.data]);
  const timezone =
    sites.data?.find((site) => site.siteId === siteId)?.timezone ?? "UTC";
  const { data, error, loading, retry } = useAsync(
    () =>
      siteId
        ? getEntries(
            siteId,
            siteRangeToUtc(range.from, timezone),
            siteRangeToUtc(range.to, timezone, true),
            page,
            pageSize,
          )
        : Promise.resolve(undefined),
    [siteId, range.from, range.to, page, timezone],
  );
  const filtered = useMemo(
    () =>
      data?.items.filter(
        (x) =>
          !search ||
            [x.name, x.visitorId, x.gender, x.severity, x.zone].some((v) =>
            v?.toLowerCase().includes(search.toLowerCase()),
          ),
      ) ?? [],
    [data, search],
  );
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const pageError = sites.error || error;
  return (
    <div className="p-5 pt-20 md:p-8 lg:p-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand">VISITOR LOG</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-navy">
            Crowd entries
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Individual visitor entry and dwell records
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {sites.data?.length ? (
            <SiteSelect
              sites={sites.data}
              value={siteId}
              onChange={(id) => {
                setSiteId(id);
                setPage(1);
              }}
            />
          ) : null}
          <DateRange
            value={range}
            onChange={(r) => {
              setRange(r);
              setPage(1);
            }}
          />
        </div>
      </header>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={18}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search this page"
              className="focus-ring w-full rounded-lg border py-2 pl-10 pr-3 text-sm"
            />
          </div>
          <p className="text-sm text-slate-500">
            <b className="text-navy">{data?.total ?? 0}</b> entries
          </p>
        </div>
        {(sites.loading && !sites.data) || (loading && !data) ? (
            <EntriesSkeleton />
        ) : pageError ? (
          <ErrorState
            message={pageError}
            retry={() => {
              void sites.retry();
              void retry();
            }}
          />
        ) : !sites.data?.length ? (
          <EmptyState message="No sites are available." />
        ) : !filtered.length ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {[
                    "Visitor",
                    "Visitor ID",
                        "Gender",
                        "Severity",
                        "Zone",
                    "Entry time",
                    "Exit time",
                    "Dwell time",
                  ].map((h) => (
                    <th key={h} className="px-5 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((row) => (
                  <tr key={row.id} className="text-sm hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-semibold text-navy">
                      {row.name || "Anonymous"}
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {row.visitorId}
                    </td>
                      <td className="px-5 py-4">{row.gender || "—"}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${severityClass(row.severity)}`}>
                          {row.severity || "—"}
                        </span>
                      </td>
                    <td className="px-5 py-4">{row.zone || "—"}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {formatTime(row.entryTime)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                        {row.exitTime == null ? "Inside" : formatTime(row.exitTime)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                        {duration(row.dwellMinutes)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t px-5 py-4 text-sm">
          <span className="text-slate-500">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            <button
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              aria-label="Next page"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function severityClass(severity?: string) {
  switch (severity?.toLowerCase()) {
    case "critical":
    case "high":
      return "bg-red-50 text-red-700";
    case "warning":
    case "medium":
      return "bg-amber-50 text-amber-700";
    case "low":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}
