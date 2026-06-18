import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useOrbital } from "@/lib/orbital/store";
import { PageHeader, SeverityBadge } from "@/components/orbital/ui";
import { sites } from "@/lib/orbital/synthetic";

export const Route = createFileRoute("/_authenticated/console/devices")({
  head: () => ({ meta: [{ title: "Devices · OrbitalGuard" }] }),
  component: DevicesList,
});

function DevicesList() {
  const { state, scores } = useOrbital();
  const [q, setQ] = useState("");
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [sev, setSev] = useState<string>("all");

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return state.devices
      .map((d) => ({ d, s: scores[d.id], last: state.history[d.id].at(-1)! }))
      .filter(({ d, s }) => {
        if (
          ql &&
          !d.id.toLowerCase().includes(ql) &&
          !d.vendor.toLowerCase().includes(ql) &&
          !d.model.toLowerCase().includes(ql)
        )
          return false;
        if (siteFilter !== "all" && d.siteId !== siteFilter) return false;
        if (sev !== "all" && s.severity !== sev) return false;
        return true;
      })
      .sort((a, b) => b.s.failureRisk - a.s.failureRisk);
  }, [state.devices, state.history, scores, q, siteFilter, sev]);

  return (
    <div>
      <PageHeader
        eyebrow="Fleet"
        title="Devices"
        description={`${state.devices.length} monitored devices · sorted by failure risk`}
      />
      <div className="space-y-4 p-6 lg:p-8">
        <div className="surface-panel flex flex-wrap items-center gap-2 p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search device, vendor, model…"
              className="rounded-md border border-border bg-elevated py-2 pl-8 pr-3 font-mono text-xs"
            />
          </div>
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="rounded-md border border-border bg-elevated px-3 py-2 font-mono text-xs"
          >
            <option value="all">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shortCode} · {s.name}
              </option>
            ))}
          </select>
          <select
            value={sev}
            onChange={(e) => setSev(e.target.value)}
            className="rounded-md border border-border bg-elevated px-3 py-2 font-mono text-xs"
          >
            <option value="all">All severities</option>
            {["healthy", "observe", "warning", "high", "critical", "offline"].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <div className="ml-auto text-xs text-muted-foreground">
            {rows.length} match{rows.length === 1 ? "" : "es"}
          </div>
        </div>

        <div className="surface-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-elevated/50 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Health</th>
                  <th className="px-4 py-3 text-right">Risk</th>
                  <th className="px-4 py-3 text-right">Latency</th>
                  <th className="px-4 py-3 text-right">CPU</th>
                  <th className="px-4 py-3 text-right">Temp</th>
                  <th className="px-4 py-3">Severity</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ d, s, last }) => (
                  <tr
                    key={d.id}
                    className="border-b border-border last:border-none hover:bg-accent/30"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        to="/console/devices/$deviceId"
                        params={{ deviceId: d.id }}
                        className="text-mono text-primary hover:underline"
                      >
                        {d.id}
                      </Link>
                      <div className="text-[11px] text-muted-foreground">
                        {d.vendor} · {d.model}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-mono text-xs">{d.siteId.toUpperCase()}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{d.type}</td>
                    <td className="px-4 py-2.5 text-right text-mono">{s.healthScore.toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-right text-mono">
                      {s.failureRisk.toFixed(0)}%
                    </td>
                    <td className="px-4 py-2.5 text-right text-mono">
                      {last.latencyMs.toFixed(1)} ms
                    </td>
                    <td className="px-4 py-2.5 text-right text-mono">{last.cpuPct.toFixed(0)}%</td>
                    <td className="px-4 py-2.5 text-right text-mono">
                      {last.temperatureC.toFixed(1)}°
                    </td>
                    <td className="px-4 py-2.5">
                      <SeverityBadge severity={s.severity} />
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No devices match the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
