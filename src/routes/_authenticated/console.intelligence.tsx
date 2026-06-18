import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useOrbital } from "@/lib/orbital/store";
import { DEFAULT_WEIGHTS, ENGINE_VERSION } from "@/lib/orbital/scoring";
import { PageHeader, Section, StatCard } from "@/components/orbital/ui";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, CheckCircle, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/console/intelligence")({
  head: () => ({ meta: [{ title: "Predictive Intelligence · OrbitalGuard" }] }),
  component: Intelligence,
});

function Intelligence() {
  const { state, scores, weights, setWeights } = useOrbital();
  const [local, setLocal] = useState(weights);
  const [aiState, setAiState] = useState<{
    loading: boolean;
    data: string | null;
    grounded: boolean;
    error: string | null;
  }>({ loading: false, data: null, grounded: false, error: null });

  const stats = useMemo(() => {
    const arr = Object.values(scores);
    const total = arr.length;
    const flagged = arr.filter((s) => s.failureRisk >= 45).length;
    const high = arr.filter((s) => s.failureRisk >= 70).length;
    const avgConfidence = arr.reduce((s, x) => s + x.confidence, 0) / Math.max(1, total);
    const avgDq = arr.reduce((s, x) => s + x.dataQuality, 0) / Math.max(1, total);
    return { total, flagged, high, avgConfidence, avgDq };
  }, [scores]);

  const requestExplanation = async () => {
    setAiState({ loading: true, data: null, grounded: false, error: null });
    try {
      const summaryContext = `Total devices: ${stats.total}, Flagged: ${stats.flagged}, High risk: ${stats.high}. Average confidence: ${(stats.avgConfidence * 100).toFixed(0)}%. Average data quality: ${(stats.avgDq * 100).toFixed(0)}%.`;

      const { data, error } = await supabase.functions.invoke("granite-connect", {
        body: {
          message: `Explain the current predictive state of the network. Context: ${summaryContext}`,
          mode: "grounded_explanation",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAiState({ loading: false, data: data.message, grounded: data.grounded, error: null });
    } catch (err: any) {
      setAiState({ loading: false, data: null, grounded: false, error: err.message });
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Engine"
        title="Predictive Intelligence"
        description="Transparent statistical scoring. Outputs are reproducible from telemetry — no opaque ML model behind the values shown."
      >
        <span className="chip">engine · {ENGINE_VERSION}</span>
      </PageHeader>

      <div className="space-y-6 p-6 lg:p-8">
        <div className="surface-panel border-l-2 border-primary p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">No fabricated ML metrics.</strong> This build does not
          display ROC-AUC, precision, recall, or accuracy because no labelled evaluation dataset has
          been processed yet. Those metrics will appear here once an evaluation run completes
          against a labelled dataset (planned for the next phase).
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Devices scored" value={stats.total} />
          <StatCard
            label="Flagged (risk ≥ 45)"
            value={stats.flagged}
            tone={stats.flagged > 0 ? "warning" : "healthy"}
          />
          <StatCard
            label="High risk (≥ 70)"
            value={stats.high}
            tone={stats.high > 0 ? "critical" : "healthy"}
          />
          <StatCard
            label="Avg confidence"
            value={(stats.avgConfidence * 100).toFixed(0) + "%"}
            sub={`avg data quality ${(stats.avgDq * 100).toFixed(0)}%`}
          />
        </div>

        <Section title="AI Predictive Explanation">
          <div className="surface-elevated rounded-lg border border-border p-6">
            {!aiState.data && !aiState.loading && !aiState.error ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Sparkles className="h-8 w-8 text-primary/30 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Request a summary explanation of the current fleet predictive health state from
                  IBM Granite.
                </p>
                <button
                  onClick={requestExplanation}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition"
                >
                  Explain Predictive State
                </button>
              </div>
            ) : aiState.loading ? (
              <div className="flex items-center gap-3 text-muted-foreground py-4 justify-center">
                <Sparkles className="h-5 w-5 animate-pulse text-primary" />
                <span className="text-sm">IBM Granite is analyzing the predictive state...</span>
              </div>
            ) : aiState.error ? (
              <div className="bg-red-500/10 text-red-500 p-4 rounded-md text-sm">
                Failed to fetch explanation: {aiState.error}
                <button onClick={requestExplanation} className="mt-2 text-xs underline block">
                  Try again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {aiState.data}
                </div>
                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    {aiState.grounded ? (
                      <span className="text-[var(--color-status-healthy)] flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5" /> Grounded explanation
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5" /> Synthesized from telemetry context
                      </span>
                    )}
                  </div>
                  <button
                    onClick={requestExplanation}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" /> Refresh Analysis
                  </button>
                </div>
              </div>
            )}
          </div>
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Scoring methodology">
            <ul className="space-y-2 text-sm text-foreground/90">
              <li>· Rolling 5-minute mean denoises spot readings.</li>
              <li>· 30–180 minute baseline drives z-score deviation analysis.</li>
              <li>· Piecewise risk bands map raw metrics to a 0–100 component risk.</li>
              <li>
                · Component risks are combined using configurable weights into a weighted
                operational risk.
              </li>
              <li>· Health score = 100 − Weighted Operational Risk.</li>
              <li>
                · Failure risk blends weighted risk, anomaly score, and short-term trend slope.
              </li>
              <li>
                · Root-cause ranking distributes total signal across correlated cause hypotheses.
              </li>
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <Reset
                label="Reset to defaults"
                onClick={() => {
                  setLocal(DEFAULT_WEIGHTS);
                  setWeights(DEFAULT_WEIGHTS);
                }}
              />
              <Reset label="Apply current values" onClick={() => setWeights(local)} primary />
            </div>
          </Section>

          <Section title="Component weights">
            <div className="space-y-2">
              {Object.entries(local).map(([key, value]) => (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize">{key}</span>
                    <span className="text-mono">{value.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.3}
                    step={0.01}
                    value={value}
                    onChange={(e) => setLocal({ ...local, [key]: Number(e.target.value) })}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-[var(--color-primary)]"
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Weights are normalised internally. Sum is informational only. Total:{" "}
              <span className="text-mono">
                {Object.values(local)
                  .reduce((a, b) => a + b, 0)
                  .toFixed(2)}
              </span>
            </p>
          </Section>
        </div>

        <Section title="Current device scores (snapshot)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-2 py-2">Device</th>
                  <th className="px-2 py-2 text-right">Health</th>
                  <th className="px-2 py-2 text-right">Anomaly</th>
                  <th className="px-2 py-2 text-right">Failure risk</th>
                  <th className="px-2 py-2 text-right">Confidence</th>
                  <th className="px-2 py-2 text-right">Data Q</th>
                  <th className="px-2 py-2">Predicted cause</th>
                </tr>
              </thead>
              <tbody>
                {state.devices.map((d) => {
                  const s = scores[d.id];
                  return (
                    <tr key={d.id} className="border-b border-border last:border-none">
                      <td className="px-2 py-2 text-mono">{d.id}</td>
                      <td className="px-2 py-2 text-right text-mono">{s.healthScore.toFixed(1)}</td>
                      <td className="px-2 py-2 text-right text-mono">
                        {s.anomalyScore.toFixed(1)}
                      </td>
                      <td className="px-2 py-2 text-right text-mono">
                        {s.failureRisk.toFixed(0)}%
                      </td>
                      <td className="px-2 py-2 text-right text-mono">
                        {(s.confidence * 100).toFixed(0)}%
                      </td>
                      <td className="px-2 py-2 text-right text-mono">
                        {(s.dataQuality * 100).toFixed(0)}%
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">{s.predictedFailureType}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Reset({
  label,
  onClick,
  primary,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-xs font-medium ${primary ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-border bg-elevated text-foreground hover:bg-accent"}`}
    >
      {label}
    </button>
  );
}
