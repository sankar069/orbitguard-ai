import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useOrbital } from "@/lib/orbital/store";
import { PageHeader, Section, SeverityBadge } from "@/components/orbital/ui";

export const Route = createFileRoute("/_authenticated/console/predictions")({
  head: () => ({ meta: [{ title: "Predictions · OrbitalGuard" }] }),
  component: PredictionsPage,
});

function PredictionsPage() {
  const { state, scores } = useOrbital();

  const rows = useMemo(() => {
    return state.devices
      .map(d => ({ d, s: scores[d.id] }))
      .filter(({ s }) => s.failureRisk >= 21)
      .sort((a, b) => b.s.failureRisk - a.s.failureRisk);
  }, [state.devices, scores]);

  return (
    <div>
      <PageHeader
        eyebrow="Predictions"
        title="Active predictions"
        description="Devices with failure risk ≥ 21%. Predictions are reproducible from the current telemetry window and include their evidence, confidence, and data-quality status."
      />
      <div className="space-y-4 p-6 lg:p-8">
        {rows.length === 0 && (
          <div className="surface-panel p-10 text-center text-sm text-muted-foreground">
            <strong className="block text-foreground">Insufficient evidence to flag any device.</strong>
            All devices are within normal operational bands. Inject a fault from the Topology or
            Devices view to see how a prediction is formed.
          </div>
        )}
        {rows.map(({ d, s }) => (
          <div key={d.id} className="surface-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Link to="/console/devices/$deviceId" params={{ deviceId: d.id }} className="text-mono text-primary hover:underline">{d.id}</Link>
                  <SeverityBadge severity={s.severity} />
                  <span className="chip">horizon {s.predictionHorizonMinutes}m</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {d.vendor} {d.model} · {d.siteId.toUpperCase()} · last update {new Date(s.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-right">
                <Mini label="Risk" value={`${s.failureRisk.toFixed(0)}%`} />
                <Mini label="Confidence" value={`${(s.confidence * 100).toFixed(0)}%`} />
                <Mini label="Data Q" value={`${(s.dataQuality * 100).toFixed(0)}%`} />
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Most likely cause</div>
                <div className="mt-1 text-sm font-medium">{s.predictedFailureType.replace(/-/g, " ")}</div>
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                  {s.rootCauseCandidates[0]?.evidence.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Recommended investigation</div>
                <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs">
                  {s.recommendedActions.slice(0, 3).map((a, i) => <li key={i}>{a}</li>)}
                </ol>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-elevated px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-mono text-sm">{value}</div>
    </div>
  );
}
