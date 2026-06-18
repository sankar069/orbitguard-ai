import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/orbital/ui";

export const Route = createFileRoute("/_authenticated/console/about")({
  head: () => ({ meta: [{ title: "About · OrbitalGuard" }] }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div>
      <PageHeader
        eyebrow="About"
        title="OrbitalGuard AI"
        description="Air-gapped predictive intelligence for mission-critical network operations."
      />
      <div className="space-y-4 p-6 lg:p-8 max-w-3xl">
        <Section title="Product statement">
          <p className="text-sm leading-relaxed text-muted-foreground">
            OrbitalGuard AI is a secure, offline-first network intelligence platform that combines
            real-time monitoring, statistical anomaly detection, predictive risk scoring,
            explainable analysis, trusted document retrieval, and human-controlled incident response
            to protect mission-critical digital infrastructure.
          </p>
        </Section>

        <Section title="Phase 1 — what is shipped">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              Synthetic mission-network data generator with daily traffic cycles, baselines, and
              configurable fault injection.
            </li>
            <li>
              Transparent statistical scoring engine: rolling means, z-scores, weighted risk
              composition, root-cause ranking.
            </li>
            <li>
              Live Mission Overview, Network Topology, Devices list and detail, Predictions,
              Predictive Intelligence, Sustainability Impact.
            </li>
            <li>Editable scoring weights and editable sustainability assumptions.</li>
            <li>Eight fault scenarios available for live injection on any device.</li>
          </ul>
        </Section>

        <Section title="Planned phases">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              Authentication, role-based access (Operator, Manager, Security, Admin, Auditor).
            </li>
            <li>Incident workflow with human approval, audit log, downloadable PDF reports.</li>
            <li>Local document retrieval (Orbital Copilot) over an approved knowledge base.</li>
            <li>
              Persistent storage on Lovable Cloud for documents, incidents, audit trail, and
              user-uploaded telemetry.
            </li>
            <li>
              Labelled evaluation runs with real precision, recall, ROC-AUC against an evaluation
              dataset.
            </li>
          </ul>
        </Section>

        <Section title="Technology">
          <p className="text-sm text-muted-foreground">
            TanStack Start · React 19 · TypeScript · Tailwind CSS v4 · Recharts · lucide-react.
            Phase 2 will introduce Lovable Cloud (Postgres, Auth, Storage) for persistence,
            documents, and audit.
          </p>
        </Section>
      </div>
    </div>
  );
}
