import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertCircle, Clock3, Footprints, Radio, Users } from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Label,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DateRange, type Range } from "../components/DateRange";
import { SiteSelect } from "../components/SiteSelect";
import { DashboardSkeleton, EmptyState, ErrorState } from "../components/States";
import { getOverview, getSites } from "../lib/api";
import { duration, formatNumber, siteRangeToUtc } from "../lib/format";
import { useAsync } from "../hooks/useAsync";
import { useLiveUpdates } from "../hooks/useLiveUpdates";
import type { Alert } from "../types";
const colors = ["#2563eb", "#8b5cf6"];
const today = format(new Date(), "yyyy-MM-dd");
export function Dashboard() {
  const [range, setRange] = useState<Range>({ from: today, to: today });
  const [siteId, setSiteId] = useState("");
  const sites = useAsync(getSites, []);
  useEffect(() => {
    if (!siteId && sites.data?.[0]) setSiteId(sites.data[0].siteId);
  }, [siteId, sites.data]);
  const timezone =
    sites.data?.find((site) => site.siteId === siteId)?.timezone ?? "UTC";
  const { data, error, loading, retry } = useAsync(
    () =>
      siteId
        ? getOverview(
            siteId,
            siteRangeToUtc(range.from, timezone),
            siteRangeToUtc(range.to, timezone, true),
          )
        : Promise.resolve(undefined),
    [siteId, range.from, range.to, timezone],
  );
  const [liveOccupancy, setLiveOccupancy] = useState<number>();
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([]);
  useEffect(() => setLiveOccupancy(undefined), [siteId]);
  const occupancy = useCallback((v: number) => setLiveOccupancy(v), []);
  const alert = useCallback(
    (v: Alert) => setLiveAlerts((a) => [v, ...a].slice(0, 20)),
    [],
  );
  const connected = useLiveUpdates(siteId, occupancy, alert);
  const alerts = useMemo(
    () => [...liveAlerts, ...(data?.alerts ?? [])],
    [liveAlerts, data],
  );
  const timeLabel = (value: number) =>
    new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  const pageError = sites.error || error;
  return (
    <div className="p-5 pt-20 md:p-8 lg:p-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand">
            OPERATIONS OVERVIEW
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-navy">
            Crowd intelligence
          </h1>
          <div
            className={`mt-2 inline-flex items-center gap-2 text-xs ${connected ? "text-emerald-600" : "text-slate-500"}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}
            />
            {connected ? "Live updates connected" : "Live updates disconnected"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {sites.data?.length ? (
            <SiteSelect
              sites={sites.data}
              value={siteId}
              onChange={setSiteId}
            />
          ) : null}
          <DateRange value={range} onChange={setRange} />
        </div>
      </header>
      {(sites.loading && !sites.data) || (loading && !data) ? (
        <DashboardSkeleton />
      ) : pageError ? (
        <div className="card">
          <ErrorState
            message={pageError}
            retry={() => {
              void sites.retry();
              void retry();
            }}
          />
        </div>
      ) : !sites.data?.length ? (
        <EmptyState message="No sites are available." />
      ) : !data ? (
        <EmptyState />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={Users}
              label="Live occupancy"
              value={liveOccupancy == null ? "—" : formatNumber(liveOccupancy)}
              note={
                connected ? "Live Socket.IO value" : "Waiting for live data"
              }
              accent
            />
            <Metric
              icon={Footprints}
              label="Total footfall"
              value={formatNumber(data.footfall)}
              note="Selected period"
            />
            <Metric
              icon={Clock3}
              label="Average dwell time"
              value={duration(data.averageDwellMinutes)}
              note="Across all visitors"
            />
            <Metric
              icon={Radio}
              label="Live status"
              value={connected ? "Connected" : "Offline"}
              note={
                connected
                  ? "Streaming in real time"
                  : "Historical analytics only"
              }
            />
          </section>
          <section className="mt-6 grid gap-6 xl:grid-cols-3">
            <ChartCard
              title="Occupancy trend"
              subtitle={`Hourly average · ${timezone}`}
              className="xl:col-span-2"
              empty={!data.trend.length}
            >
              <LineChart data={data.trend}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={timeLabel}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip labelFormatter={(value) => timeLabel(Number(value))} />
                <Line
                  type="monotone"
                  dataKey="occupancy"
                  name="Average occupancy"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ChartCard>
            <Alerts alerts={alerts} />
          </section>
          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <ChartCard
              title="Gender trend"
              subtitle={`Hourly male/female counts · ${timezone}`}
              empty={!data.demographicTrend.length}
            >
              <LineChart data={data.demographicTrend}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={timeLabel}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip labelFormatter={(value) => timeLabel(Number(value))} />
                <Line
                  type="monotone"
                  dataKey="male"
                  name="Male"
                  stroke={colors[0]}
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="female"
                  name="Female"
                  stroke={colors[1]}
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ChartCard>
            <Donut data={data.gender} />
          </section>
        </>
      )}
    </div>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  note,
  accent = false,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`card p-5 ${accent ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0" : ""}`}
    >
      <div
        className={`mb-5 inline-flex rounded-xl p-2.5 ${accent ? "bg-white/15" : "bg-blue-50 text-brand"}`}
      >
        <Icon size={20} />
      </div>
      <p className={`text-sm ${accent ? "text-blue-100" : "text-slate-500"}`}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p
        className={`mt-2 text-xs ${accent ? "text-blue-200" : "text-slate-400"}`}
      >
        {note}
      </p>
    </div>
  );
}
function CardTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="font-bold text-navy">{title}</h2>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}
function ChartCard({
  title,
  subtitle,
  empty,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  empty: boolean;
  children: React.ReactElement;
  className?: string;
}) {
  return (
    <div className={`card p-6 ${className}`}>
      <CardTitle title={title} subtitle={subtitle} />
      {empty ? (
        <EmptyState />
      ) : (
        <div className="mt-6 h-72">
          <ResponsiveContainer>{children}</ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
function Alerts({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="card p-6">
      <CardTitle
        title="Live alerts"
        subtitle={`${alerts.length} recent events`}
      />
      <div className="mt-4 max-h-72 space-y-3 overflow-auto">
        {alerts.length ? (
          alerts.map((a) => (
            <div key={a.id} className="flex gap-3 rounded-xl bg-slate-50 p-3">
              <AlertCircle
                className={
                  a.severity === "critical"
                    ? "text-red-500"
                    : a.severity === "warning"
                      ? "text-amber-500"
                      : "text-blue-500"
                }
                size={18}
              />
              <div>
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="mt-1 text-xs text-slate-500">{a.message}</p>
              </div>
            </div>
          ))
        ) : (
          <EmptyState message="No live alerts." />
        )}
      </div>
    </div>
  );
}
function Donut({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="card p-6">
      <CardTitle
        title="Gender distribution"
        subtitle="Latest hourly snapshot"
      />
      {data.length && total > 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center pt-2">
          <div className="h-52 w-full max-w-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                  <Label
                    position="center"
                    content={({ viewBox }) => {
                      const box = viewBox as { cx?: number; cy?: number };
                      return (
                        <g>
                          <text x={box.cx} y={(box.cy ?? 0) - 4} textAnchor="middle" className="fill-navy text-2xl font-bold">{total.toLocaleString()}</text>
                          <text x={box.cx} y={(box.cy ?? 0) + 18} textAnchor="middle" className="fill-slate-400 text-xs">Total</text>
                        </g>
                      );
                    }}
                  />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex w-full flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t pt-4">
            {data.map((item, index) => (
              <div key={item.label} className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                <span className="text-sm text-slate-500">{item.label}</span>
                <span className="text-sm font-bold text-navy">{((item.value / total) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
