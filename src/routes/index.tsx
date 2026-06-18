import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Boxes,
  BrainCircuit,
  Lock,
  Radio,
  Satellite,
  ShieldCheck,
  TrendingDown,
  Workflow,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OrbitalGuard AI · Predict Network Failures Before They Disrupt Operations" },
      {
        name: "description",
        content:
          "Air-gapped predictive intelligence for mission-critical network operations. Monitor telemetry, detect anomalies, forecast failures, and coordinate human-controlled response — without sending operational data to the cloud.",
      },
      { property: "og:title", content: "OrbitalGuard AI" },
      {
        property: "og:description",
        content: "Air-gapped predictive intelligence for mission-critical network operations.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <StarField />
      <Header />
      <Hero />
      <SectionMission />
      <SectionCapabilities />
      <SectionArchitecture />
      <SectionResponsible />
      <SectionSustainability />
      <SectionCTA />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="relative z-20 border-b border-border/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <div>
            <div className="text-sm font-semibold tracking-tight">OrbitalGuard AI</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Mission-Critical Network Intelligence
            </div>
          </div>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#mission" className="hover:text-foreground">
            Mission
          </a>
          <a href="#capabilities" className="hover:text-foreground">
            Capabilities
          </a>
          <a href="#architecture" className="hover:text-foreground">
            Architecture
          </a>
          <a href="#responsible-ai" className="hover:text-foreground">
            Responsible AI
          </a>
        </nav>
        <Link
          to="/console"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          Launch Mission Console
          <Radio className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  );
}

function LogoMark() {
  return (
    <div className="relative grid h-9 w-9 place-items-center rounded-md border border-border bg-elevated">
      <Satellite className="h-4 w-4 text-primary" />
      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--color-status-healthy)] animate-orbital-pulse" />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative z-10">
      <div className="absolute inset-0 -z-10 hud-radial" />
      <div className="absolute inset-0 -z-10 hud-grid" />
      <div className="mx-auto grid max-w-7xl gap-12 px-6 pt-16 pb-24 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:pt-24 lg:pb-32">
        <div>
          <div className="chip mb-6">
            <span className="status-dot bg-[var(--color-status-healthy)] text-[var(--color-status-healthy)]" />
            Air-gapped · Offline-first · Human-controlled
          </div>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Predict network failures
            <span className="block text-primary">before they disrupt operations.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            OrbitalGuard AI monitors secure network telemetry, detects anomalies, forecasts
            equipment failures, retrieves trusted troubleshooting procedures, and supports
            human-controlled incident response — without exposing operational data to the public
            internet.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/console"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              <Radio className="h-4 w-4" />
              Launch Mission Console
            </Link>
            <a
              href="#architecture"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-elevated px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Explore Architecture
            </a>
            <Link
              to="/console/topology"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-transparent px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              View Live Simulation
            </Link>
          </div>
          <p className="mt-6 max-w-xl font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Demonstration uses synthetic mission-network data · No real operational telemetry ·
            Calculated outputs only
          </p>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative">
      <div className="surface-panel relative overflow-hidden p-5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
          <div className="absolute inset-0 hud-grid" />
        </div>

        <div className="flex items-center justify-between">
          <div className="chip">
            <span className="status-dot bg-[var(--color-status-healthy)] text-[var(--color-status-healthy)] animate-orbital-pulse" />
            Mission Console · Live
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Air-gapped
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <HudCard label="Devices online" value="17" sub="/ 18 monitored" tone="healthy" />
          <HudCard label="Avg health" value="91.2" sub="0–100 score" tone="healthy" />
          <HudCard label="Predicted risks" value="2" sub="60-min horizon" tone="warning" />
        </div>

        <div className="mt-4 surface-elevated p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Network telemetry · latency (ms)</span>
            <span className="font-mono">last 60 min</span>
          </div>
          <Sparkline />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <SatelliteCard />
          <DeviceTile name="GSS-EDG01" status="warning" />
        </div>
      </div>
      <div className="pointer-events-none absolute -inset-x-6 -inset-y-6 -z-10 rounded-2xl bg-primary/5 blur-3xl" />
    </div>
  );
}

function HudCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "healthy" | "warning" | "critical";
}) {
  const color =
    tone === "healthy"
      ? "text-[var(--color-status-healthy)]"
      : tone === "warning"
        ? "text-[var(--color-status-warning)]"
        : "text-[var(--color-status-critical)]";
  return (
    <div className="surface-elevated p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-display text-2xl font-semibold tabular-nums ${color}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function Sparkline() {
  // Static decorative SVG sparkline — landing page only.
  const pts = [12, 11, 13, 10, 12, 11, 14, 12, 11, 12, 13, 15, 13, 12, 11, 13, 12, 14, 13, 12];
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const w = 320,
    h = 70;
  const step = w / (pts.length - 1);
  const path = pts
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)} ${(h - ((v - min) / (max - min || 1)) * (h - 8) - 4).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full">
      <defs>
        <linearGradient id="ll" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${w} ${h} L0 ${h} Z`} fill="url(#ll)" />
      <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="1.5" />
    </svg>
  );
}

function SatelliteCard() {
  return (
    <div className="surface-elevated relative overflow-hidden p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Ground link · GSN ↔ MCC
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Satellite className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-border">
            <div className="h-1.5 w-3/4 rounded-full bg-primary" />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>40 Gbps</span>
            <span>62% util</span>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-primary/15 to-transparent animate-scan" />
    </div>
  );
}

function DeviceTile({ name, status }: { name: string; status: "healthy" | "warning" }) {
  const color =
    status === "warning"
      ? "text-[var(--color-status-warning)]"
      : "text-[var(--color-status-healthy)]";
  return (
    <div className="surface-elevated p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Device
      </div>
      <div className="mt-1 font-mono text-sm font-semibold">{name}</div>
      <div className={`mt-2 inline-flex items-center gap-2 text-xs ${color}`}>
        <span
          className={`status-dot bg-current ${status === "warning" ? "" : "animate-orbital-pulse"}`}
        />
        {status === "warning" ? "Observe · optical Rx degrading" : "Nominal"}
      </div>
    </div>
  );
}

function StarField() {
  // Tiny CSS star field — soft, low-opacity, no animation that interferes with content.
  const stars = Array.from({ length: 80 }, (_, i) => ({
    x: (i * 37) % 100,
    y: (i * 73) % 100,
    s: 0.6 + ((i * 13) % 10) / 10,
    o: 0.2 + (((i * 7) % 8) / 10) * 0.6,
  }));
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-foreground"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.s}px`,
            height: `${s.s}px`,
            opacity: s.o,
          }}
        />
      ))}
    </div>
  );
}

function SectionMission() {
  return (
    <section id="mission" className="border-t border-border/60 py-20">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <div className="chip mx-auto">The mission</div>
        <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">
          A unified command centre for mission-critical infrastructure.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          OrbitalGuard AI gives network operations teams an integrated environment to monitor
          infrastructure health, investigate anomalies, predict failures, and manage incidents with
          explainable analysis and authoritative human oversight.
        </p>
      </div>
    </section>
  );
}

function SectionCapabilities() {
  const items = [
    {
      icon: Activity,
      title: "Statistical anomaly detection",
      body: "Z-score deviation analysis across latency, jitter, loss, CPU, temperature, optical Rx, and security telemetry — calculated from each device's own baseline.",
    },
    {
      icon: TrendingDown,
      title: "Predictive risk scoring",
      body: "Weighted operational-risk composition produces a 0–100 health score, anomaly score, failure-risk percentage, and prediction horizon for every device.",
    },
    {
      icon: Workflow,
      title: "Root-cause ranking",
      body: "Correlated symptoms rank likely causes — optical degradation, overheating, congestion, suspicious activity — with the supporting evidence shown.",
    },
    {
      icon: BrainCircuit,
      title: "Explainable predictions",
      body: "Every prediction lists contributing factors, confidence, data quality, model version, and a recommended human investigation step.",
    },
    {
      icon: Lock,
      title: "Air-gapped by default",
      body: "Telemetry, scores, and recommendations are computed locally. No operational data is sent to external AI services for core functionality.",
    },
    {
      icon: ShieldCheck,
      title: "Human-controlled response",
      body: "Critical actions require Operations Manager approval. OrbitalGuard recommends and explains; authorised personnel decide and act.",
    },
  ];
  return (
    <section id="capabilities" className="border-t border-border/60 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 max-w-2xl">
          <div className="chip">Capabilities</div>
          <h2 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
            Predictive intelligence with full traceability.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="surface-panel p-6 transition-colors hover:border-primary/40"
            >
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionArchitecture() {
  return (
    <section id="architecture" className="border-t border-border/60 py-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="chip">Air-gapped architecture</div>
          <h2 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
            Your operational data stays inside your infrastructure.
          </h2>
          <p className="mt-4 text-muted-foreground">
            OrbitalGuard AI does not depend on external cloud-based AI services for its core
            monitoring, prediction, retrieval, or incident-response functions. Every prediction is
            reproducible from the underlying telemetry — there is no hidden inference path.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Statistical scoring engine runs entirely in-browser; outputs deterministic from input.",
              "Document retrieval (planned) operates over a local approved knowledge base only.",
              "Optional cloud summarisation is clearly disclosed, disabled by default, and confined to retrieved passages.",
              "Service-role keys never leave the server. Critical actions require human approval.",
            ].map((t) => (
              <li key={t} className="flex gap-3 text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <ArchitectureDiagram />
      </div>
    </section>
  );
}

function ArchitectureDiagram() {
  return (
    <div className="surface-panel relative overflow-hidden p-6">
      <div className="absolute inset-0 -z-10 hud-grid opacity-50" />
      <div className="grid gap-3">
        {[
          { l: "Network devices", r: "telemetry" },
          { l: "Ingestion + cleaning", r: "data-quality" },
          { l: "Statistical scoring engine", r: "health · anomaly · risk" },
          { l: "Root-cause correlator", r: "ranked causes + evidence" },
          { l: "Retrieval (knowledge base)", r: "approved SOPs only" },
          { l: "Operator console", r: "human approval" },
        ].map((row, i, arr) => (
          <div key={row.l} className="relative">
            <div className="surface-elevated flex items-center justify-between p-3">
              <span className="text-sm">{row.l}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {row.r}
              </span>
            </div>
            {i < arr.length - 1 && <div className="ml-6 h-3 w-px bg-border" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionResponsible() {
  return (
    <section id="responsible-ai" className="border-t border-border/60 py-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-1">
          <div className="chip">Responsible AI</div>
          <h2 className="mt-3 font-display text-3xl font-semibold">
            Honest about what the system does — and doesn't.
          </h2>
        </div>
        <div className="space-y-4 lg:col-span-2">
          {[
            {
              t: "No fake accuracy claims.",
              b: "The current build is a statistical scoring prototype, not a trained ML classifier. Performance metrics are only shown when calculated from real evaluation runs.",
            },
            {
              t: "Insufficient evidence is stated, not invented.",
              b: "When telemetry coverage is insufficient, the system says so instead of producing a confident-looking guess.",
            },
            {
              t: "Final decisions remain with people.",
              b: "OrbitalGuard AI provides decision support. Authorised personnel review, approve, and control every critical operational action.",
            },
          ].map((x) => (
            <div key={x.t} className="surface-panel p-5">
              <div className="text-sm font-semibold">{x.t}</div>
              <div className="mt-1.5 text-sm text-muted-foreground">{x.b}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionSustainability() {
  return (
    <section className="border-t border-border/60 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <div className="chip">Sustainability</div>
            <h2 className="mt-3 font-display text-3xl font-semibold">
              Predictive maintenance, less avoidable waste.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Early detection helps reduce emergency hardware replacement, extends equipment
              lifespan, and improves the operational efficiency of mission-critical infrastructure.
              Estimates shown are configurable prototype calculations — not verified facts.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { k: "SDG 9", v: "Industry, Innovation & Infrastructure" },
              { k: "SDG 12", v: "Responsible Consumption & Production" },
              { k: "Transparent", v: "Every estimate exposes its assumptions" },
            ].map((c) => (
              <div key={c.k} className="surface-panel p-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary">
                  {c.k}
                </div>
                <div className="mt-2 text-sm">{c.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionCTA() {
  return (
    <section className="border-t border-border/60 py-20">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="font-display text-3xl font-semibold md:text-4xl">
          Step into the Mission Console.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Explore the live simulation, inspect device telemetry, and walk through the three guided
          demonstration scenarios.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/console"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            <Radio className="h-4 w-4" />
            Enter Mission Console
          </Link>
          <Link
            to="/console/topology"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-elevated px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Boxes className="h-4 w-4" />
            Start Network Simulation
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            OrbitalGuard AI · Prototype build
          </span>
        </div>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <Link to="/console/responsible-ai" className="hover:text-foreground">
            Responsible AI
          </Link>
          <Link to="/console/about" className="hover:text-foreground">
            About
          </Link>
          <a href="#architecture" className="hover:text-foreground">
            Architecture
          </a>
        </div>
      </div>
    </footer>
  );
}
