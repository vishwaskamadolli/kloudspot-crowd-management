export type TrendPoint = {
  timestamp: number;
  occupancy: number;
  entries?: number;
  exits?: number;
};
export type Demographic = { label: string; value: number };
export type DemographicPoint = {
  timestamp: number;
  male: number;
  female: number;
};
export type Alert = {
  id: string;
  title: string;
  message: string;
  severity: "critical" | "warning" | "info";
  timestamp: number;
};
export type Overview = {
  occupancy?: number;
  capacity?: number;
  footfall: number;
  averageDwellMinutes: number;
  trend: TrendPoint[];
  demographicTrend: DemographicPoint[];
  gender: Demographic[];
  alerts: Alert[];
};
export type CrowdEntry = {
  id: string;
  visitorId: string;
  name?: string;
  gender?: string;
  severity?: string;
  ageGroup?: string;
  entryTime: number;
  exitTime?: number;
  dwellMinutes?: number;
  zone?: string;
};
export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
export type Site = {
  siteId: string;
  name: string;
  timezone: string;
  country: string;
  city: string;
  zones: { zoneId: string; name: string; securityLevel: string }[];
};
