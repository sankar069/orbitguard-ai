import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useOrbital } from "@/lib/orbital/store";
import { PageHeader, Section } from "@/components/orbital/ui";
import { SimulationControls } from "@/components/orbital/SimulationControls";
import { sites } from "@/lib/orbital/synthetic";
import { severityColor, severityLabel } from "@/lib/orbital/scoring";

export const Route = createFileRoute("/_authenticated/console/topology")({
  head: () => ({ meta: [{ title: "Network Topology · OrbitalGuard" }] }),
  component: TopologyPage,
});

function TopologyPage() {
  const { state, scores } = useOrbital();
  const [selected, setSelected] = useState<string | null>(null);

  // Position devices around their site center.
  const positions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    for (const site of sites) {
      const devices = state.devices.filter(d => d.siteId === site.id);
      devices.forEach((d, i) => {
        const angle = (i / Math.max(1, devices.length)) * Math.PI * 2;
        const r = 0.06;
        map[d.id] = {
          x: site.coord.x + r * Math.cos(angle),
          y: site.coord.y + r * Math.sin(angle),
        };
      });
    }
    return map;
  }, [state.devices]);

  const W = 1000, H = 620;
  const px = (x: number) => x * W;
  const py = (y: number) => y * H;

  const selectedDevice = selected ? state.devices.find(d => d.id === selected) : null;
  const selectedScore = selected ? scores[selected] : null;

  return (
    <div>
      <PageHeader
        eyebrow="Topology"
        title="Network topology · live"
        description="Mission Control Centre · two ground stations · backup operations · data processing · security operations. Click a node for details."
      />
      <div className="space-y-4 p-6 lg:p-8">
        <SimulationControls />
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="surface-panel relative overflow-hidden">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-grid)" strokeWidth="0.5" />
                </pattern>
                <radialGradient id="siteHalo" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width={W} height={H} fill="url(#grid)" opacity="0.4" />

              {/* Site halos + labels */}
              {sites.map(s => (
                <g key={s.id}>
                  <circle cx={px(s.coord.x)} cy={py(s.coord.y)} r={70} fill="url(#siteHalo)" />
                  <text x={px(s.coord.x)} y={py(s.coord.y) - 78} textAnchor="middle" fill="var(--color-muted-foreground)" fontSize="10" fontFamily="var(--font-mono)" style={{ letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {s.shortCode} · {s.name}
                  </text>
                </g>
              ))}

              {/* Links */}
              {state.links.map(l => {
                const a = positions[l.from], b = positions[l.to];
                if (!a || !b) return null;
                const sevA = scores[l.from]?.severity, sevB = scores[l.to]?.severity;
                const stroke = (sevA === "critical" || sevB === "critical") ? "var(--color-status-critical)" :
                               (sevA === "warning" || sevA === "high" || sevB === "warning" || sevB === "high") ? "var(--color-status-warning)" :
                               "var(--color-grid)";
                return (
                  <line key={l.id} x1={px(a.x)} y1={py(a.y)} x2={px(b.x)} y2={py(b.y)}
                    stroke={stroke} strokeWidth={l.primary ? 1.4 : 0.8} strokeDasharray={l.primary ? "" : "4 4"} opacity={0.7} />
                );
              })}

              {/* Devices */}
              {state.devices.map(d => {
                const p = positions[d.id];
                const s = scores[d.id];
                const color = severityColor(s.severity);
                const r = d.type === "core-router" ? 11 : 8;
                const isSel = selected === d.id;
                return (
                  <g key={d.id} className="cursor-pointer" onClick={() => setSelected(d.id)}>
                    <circle cx={px(p.x)} cy={py(p.y)} r={r + 5} fill={color} opacity={s.severity === "critical" ? 0.18 : 0} />
                    <circle cx={px(p.x)} cy={py(p.y)} r={r} fill={color} stroke={isSel ? "var(--color-foreground)" : "var(--color-background)"} strokeWidth={isSel ? 2 : 1.5} />
                    <text x={px(p.x)} y={py(p.y) + r + 11} textAnchor="middle" fill="var(--color-foreground)" fontSize="9" fontFamily="var(--font-mono)">
                      {d.id}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap gap-3 border-t border-border bg-background/80 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground backdrop-blur">
              {(["healthy","observe","warning","high","critical","offline"] as const).map(s => (
                <span key={s} className="inline-flex items-center gap-1.5">
                  <span className="status-dot" style={{ backgroundColor: severityColor(s), color: severityColor(s) }} />
                  {severityLabel(s)}
                </span>
              ))}
              <span className="ml-auto opacity-70">solid = primary path · dashed = backup</span>
            </div>
          </div>

          <Section title={selectedDevice ? "Selected device" : "Inspector"}>
            {!selectedDevice && (
              <p className="text-sm text-muted-foreground">Click a node to inspect its current state and recommended actions.</p>
            )}
            {selectedDevice && selectedScore && (
              <div className="space-y-3">
                <div className="font-mono text-sm">{selectedDevice.id}</div>
                <div className="text-xs text-muted-foreground">{selectedDevice.vendor} {selectedDevice.model} · {selectedDevice.siteId.toUpperCase()}</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Kpi label="Health"  value={selectedScore.healthScore.toFixed(0)} />
                  <Kpi label="Anomaly" value={selectedScore.anomalyScore.toFixed(0)} />
                  <Kpi label="Risk"    value={`${selectedScore.failureRisk.toFixed(0)}%`} />
                </div>
                <div className="surface-elevated p-2.5 text-xs">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Top contributors</div>
                  <ul className="mt-1.5 space-y-1">
                    {selectedScore.contributingFactors.slice(0, 4).map(c => (
                      <li key={c.key} className="flex items-center justify-between gap-2">
                        <span>{c.label}</span>
                        <span className="text-mono">{c.risk.toFixed(0)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link to="/console/devices/$deviceId" params={{ deviceId: selectedDevice.id }}
                  className="block w-full rounded-md bg-primary py-2 text-center text-xs font-medium text-primary-foreground hover:opacity-90">
                  Open device detail →
                </Link>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-elevated p-2">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono text-base">{value}</div>
    </div>
  );
}
