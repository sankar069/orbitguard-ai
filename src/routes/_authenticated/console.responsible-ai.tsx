import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/orbital/ui";

export const Route = createFileRoute("/_authenticated/console/responsible-ai")({
  head: () => ({ meta: [{ title: "Responsible AI · OrbitalGuard" }] }),
  component: ResponsibleAIPage,
});

function ResponsibleAIPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Trust"
        title="Responsible AI"
        description="OrbitalGuard AI provides decision support. Final operational decisions remain with authorised human personnel."
      />
      <div className="space-y-4 p-6 lg:p-8 max-w-3xl">
        <Section title="What this system is — and is not">
          <p className="text-sm leading-relaxed text-muted-foreground">
            The current build is a <strong className="text-foreground">statistical scoring prototype</strong>,
            not a trained machine-learning classifier. Every output is reproducible from the
            telemetry window in memory: rolling means, rolling standard deviations, z-scores,
            piecewise risk bands, and weighted composition. There is no opaque model behind the
            values shown.
          </p>
        </Section>

        <Section title="Air-gapped processing">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Telemetry, scoring, and recommendations are computed in the operator's browser.</li>
            <li>No operational data is sent to external AI services in this build.</li>
            <li>An optional cloud summarisation layer may be added in a later phase. It will be disabled by default, clearly disclosed, scoped to retrieved passages only, and never used to answer without retrieved evidence.</li>
          </ul>
        </Section>

        <Section title="Honest limits">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>No ROC-AUC, precision, recall, F1, or accuracy is displayed because no labelled evaluation dataset has been processed.</li>
            <li>Sustainability values are calculated estimates from configurable assumptions, not measured facts.</li>
            <li>When confidence or data quality is low, the system says so instead of producing a confident-looking guess.</li>
            <li>Demonstrations use synthetic data — they do not represent any real network's behaviour or capacity.</li>
          </ul>
        </Section>

        <Section title="Human control">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Recommended actions are advisory. Corrective configuration changes that may interrupt
            traffic require Operations Manager approval. The system records the recommendation,
            the decision, the approver, and the timestamp at the point of decision so the
            reasoning behind every action can be audited later.
          </p>
        </Section>

        <Section title="Explainability">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Each prediction lists its contributing factors with their individual risk values and
            weights, the z-score and rolling average behind each value, and the ranked root-cause
            hypotheses with supporting evidence. Weights are visible and editable; recalculation
            is immediate.
          </p>
        </Section>
      </div>
    </div>
  );
}
