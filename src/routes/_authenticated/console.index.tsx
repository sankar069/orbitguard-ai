// Mission Overview — top-level dashboard.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";
import { useOrbital } from "@/lib/orbital/store";
import { PageHeader, Section, SeverityBadge, StatCard } from "@/components/orbital/ui";
import { SimulationControls } from "@/components/orbital/SimulationControls";
import { sites } from "@/lib/orbital/synthetic";

export const Route = createFileRoute("/_authenticated/console/")({
  head: () => ({
    meta: [
      { title: "Mission Overview · OrbitalGuard" },
      { name: "description", content: "Live mission overview: fleet health, predicted risks, telemetry trends." },
    ],
  }),
  component: MissionOverview,
});

function MissionOverview() {
  const { state, scores } = useOrbital();
  const devices = state.devices;

  const summary = useMemo(() => {
    let healthy = 0, observe = 0, warning = 0, high = 0, critical = 0, offline = 0;
    let healthSum = 0, latencySum = 0, lossSum = 0, predicted = 0;
    for (const d of devices) {
      const s = scores[d.id];
      if (!s) continue;
      healthSum += s.healthScore;
      const last = state.history[d.id].at(-1)!;
      latencySum += last.latencyMs;
      lossSum += last.packetLossPct;
      if (s.failureRisk >= 45) predicted++;
      switch (s.severity) {
        case "healthy": healthy++; break;
        case "observe": observe++; break;
        case "warning": warning++; break;
        case "high":    high++; break;
        case "critical": critical++; break;
        case "offline": offline++; break;
      }
    }
    return {
      total: devices.length, healthy, observe, warning, high, critical, offline,
      avgHealth: healthSum / Math.max(1, devices.length),
      avgLatency: latencySum / Math.max(1, devices.length),
      avgLoss: lossSum / Math.max(1, devices.length),
      predicted,
    };
  }, [devices, scores, state.history]);

  // Aggregate latency trend (last 60 min, mean across devices)
  const latencyTrend = useMemo(() => {
    const len = 60;
    const series: { t: number; latency: number; loss: number }[] = [];
    const buf0 = state.history[devices[0].id];
    const start = Math.max(0, buf0.length - len);
    for (let i = start; i < buf0.length; i++) {
      const t = buf0[i].t;
      let lat = 0, loss = 0, n = 0;
      for (const d of devices) {
        const p = state.history[d.id][i];
        if (!p) continue;
        lat += p.latencyMs; loss += p.packetLossPct; n++;
      }
      series.push({ t, latency: lat / n, loss: loss / n });
    }
    return series;
  }, [state.history, devices]);

  const distribution = [
    { name: "Healthy",  count: summary.healthy,  color: "var(--color-status-healthy)" },
    { name: "Observe",  count: summary.observe,  color: "var(--color-status-observe)" },
    { name: "Warning",  count: summary.warning,  color: "var(--color-status-warning)" },
    { name: "High",     count: summary.high,     color: "var(--color-status-warning)" },
    { name: "Critical", count: summary.critical, color: "var(--color-status-critical)" },
    { name: "Offline",  count: summary.offline,  color: "var(--color-status-offline)" },
  ];

  const topRisk = useMemo(() => {
    return [...devices]
      .map(d => ({ d, s: scores[d.id] }))
      .sort((a, b) => b.s.failureRisk - a.s.failureRisk)
      .slice(0, 5);
  }, [devices, scores]);

  const siteStatus = useMemo(() => {
    return sites.map(site => {
      const ds = devices.filter(d => d.siteId === site.id);
      const worst = ds.reduce((acc, d) => Math.max(acc, scores[d.id]?.failureRisk ?? 0), 0);
      return { site, count: ds.length, worstRisk: worst };
    });
  }, [devices, scores]);

  return (
    <div>
      <PageHeader
        eyebrow="Mission Overview"
        title="Fleet status · live"
        description="Synthetic mission-network data. All values are calculated from the in-browser telemetry engine."
      >
        <span className="chip">Synthetic data</span>
      </PageHeader>

      <div className="space-y-6 p-6 lg:p-8">
        <SimulationControls />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <StatCard label="Devices monitored" value={summary.total} sub={`${summary.total - summary.offline} reporting`} />
          <StatCard label="Healthy" value={summary.healthy} tone="healthy" />
          <StatCard label="Warning" value={summary.warning + summary.high} tone="warning" />
          <StatCard label="Critical" value={summary.critical} tone="critical" />
          <StatCard label="Predicted risks" value={summary.predicted} sub="risk ≥ 45%" tone={summary.predicted > 0 ? "warning" : "healthy"} />
          <StatCard label="Avg health score" value={summary.avgHealth.toFixed(1)} sub="0–100" tone={summary.avgHealth >= 80 ? "healthy" : summary.avgHealth >= 60 ? "warning" : "critical"} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Section title="Fleet latency & packet loss · 60 min">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={latencyTrend} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ga" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-grid)" vertical={false} />
                    <XAxis
                      dataKey="t" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                      tickFormatter={t => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      stroke="var(--color-grid)"
                    />
                    <YAxis yAxisId="left" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} stroke="var(--color-grid)" />
                    <Tooltip contentStyle={tipStyle} labelFormatter={t => new Date(t as number).toLocaleString()} />
                    <Area yAxisId="left" type="monotone" dataKey="latency" name="Latency (ms)" stroke="var(--color-primary)" fill="url(#ga)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </div>
          <Section title="Health distribution">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-grid)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} stroke="var(--color-grid)" />
                  <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} stroke="var(--color-grid)" allowDecimals={false} />
                  <Tooltip contentStyle={tipStyle} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {distribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Top high-risk devices" action={<Link to="/console/devices" className="text-xs text-primary hover:underline">View all →</Link>}>
            <div className="divide-y divide-border">
              {topRisk.map(({ d, s }) => (
                <Link
                  key={d.id}
                  to="/console/devices/$deviceId"
                  params={{ deviceId: d.id }}
                  className="flex items-center justify-between gap-3 py-2.5 hover:bg-accent/40 -mx-2 px-2 rounded"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-mono text-sm">{d.id}</span>
                      <SeverityBadge severity={s.severity} />
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {d.vendor} {d.model} · {d.siteId.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-mono text-sm">{s.failureRisk.toFixed(0)}%</div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      risk · {s.predictionHorizonMinutes}m
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Section>

          <Section title="Sites">
            <div className="grid gap-2 sm:grid-cols-2">
              {siteStatus.map(({ site, count, worstRisk }) => {
                const tone = worstRisk >= 70 ? "critical" : worstRisk >= 45 ? "warning" : "healthy";
                const color = tone === "critical" ? "var(--color-status-critical)" : tone === "warning" ? "var(--color-status-warning)" : "var(--color-status-healthy)";
                return (
                  <div key={site.id} className="surface-elevated p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{site.name}</div>
                      <span className="status-dot" style={{ backgroundColor: color, color }} />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono uppercase tracking-wider">{site.shortCode} · {site.region}</span>
                      <span className="text-mono">{count} devices</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

const tipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "0.5rem",
  fontSize: "12px",
  color: "var(--color-popover-foreground)",
};
