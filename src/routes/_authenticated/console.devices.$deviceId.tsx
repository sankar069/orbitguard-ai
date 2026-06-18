import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  LineChart,
} from "recharts";
import { ArrowLeft } from "lucide-react";
import { useOrbital } from "@/lib/orbital/store";
import { PageHeader, Section, SeverityBadge, StatCard } from "@/components/orbital/ui";
import { FAULT_TYPES } from "@/lib/orbital/synthetic";
import type { FaultType } from "@/lib/orbital/types";

export const Route = createFileRoute("/_authenticated/console/devices/$deviceId")({
  head: ({ params }) => ({ meta: [{ title: `${params.deviceId} · Device · OrbitalGuard` }] }),
  component: DeviceDetail,
  notFoundComponent: () => (
    <div className="p-10 text-center text-muted-foreground">Device not found.</div>
  ),
});

const RANGES = [
  { label: "1h", minutes: 60 },
  { label: "3h", minutes: 180 },
  { label: "All", minutes: 1000 },
] as const;

function DeviceDetail() {
  const { deviceId } = Route.useParams();
  const { state, scores, inject, clear } = useOrbital();
  const device = state.devices.find((d) => d.id === deviceId);
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[0]);
  const [fault, setFault] = useState<FaultType>("optical-degradation");

  if (!device) throw notFound();
  const score = scores[device.id];
  const fullHist = state.history[device.id];
  const data = fullHist.slice(-range.minutes);
  const active = state.faults.find((f) => f.deviceId === device.id);

  const tipFmt = (t: number) =>
    new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <PageHeader
        eyebrow={`${device.siteId.toUpperCase()} · ${device.type}`}
        title={device.name}
        description={`${device.vendor} ${device.model} · firmware ${device.firmware} · serial ${device.serial}`}
      >
        <Link
          to="/console/devices"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All devices
        </Link>
      </PageHeader>

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Health score"
            value={score.healthScore.toFixed(1)}
            tone={tone(score.healthScore, true)}
          />
          <StatCard
            label="Anomaly score"
            value={score.anomalyScore.toFixed(1)}
            tone={tone(score.anomalyScore)}
          />
          <StatCard
            label="Failure risk"
            value={`${score.failureRisk.toFixed(0)}%`}
            sub={`horizon ${score.predictionHorizonMinutes} min`}
            tone={tone(score.failureRisk)}
          />
          <StatCard
            label="Confidence"
            value={(score.confidence * 100).toFixed(0) + "%"}
            sub={`data quality ${(score.dataQuality * 100).toFixed(0)}%`}
          />
          <div className="surface-panel p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Status
            </div>
            <div className="mt-2">
              <SeverityBadge severity={score.severity} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Engine <span className="text-mono">{score.engineVersion}</span>
            </div>
          </div>
        </div>

        <div className="surface-panel flex flex-wrap items-center gap-2 p-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Range
          </span>
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r)}
              className={`rounded-md border px-2.5 py-1 text-xs ${range.label === r.label ? "border-primary bg-primary/10 text-primary" : "border-border bg-elevated text-muted-foreground"}`}
            >
              {r.label}
            </button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              value={fault}
              onChange={(e) => setFault(e.target.value as FaultType)}
              className="rounded-md border border-border bg-elevated px-2.5 py-1.5 font-mono text-xs"
            >
              {FAULT_TYPES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            {active ? (
              <button
                onClick={() => clear(device.id)}
                className="rounded-md border border-border bg-elevated px-3 py-1.5 text-xs hover:bg-accent"
              >
                Clear injected fault
              </button>
            ) : (
              <button
                onClick={() => inject(device.id, fault)}
                className="rounded-md border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Inject on this device
              </button>
            )}
          </div>
        </div>

        {active && (
          <div className="surface-panel border-l-2 border-[var(--color-status-warning)] p-3 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-status-warning)]">
              Injected fault
            </span>{" "}
            <span className="ml-2">{FAULT_TYPES.find((f) => f.id === active.type)?.label}</span>{" "}
            <span className="text-muted-foreground">
              · intensity {(active.intensity * 100).toFixed(0)}%
            </span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Latency & jitter (ms)">
            <ChartArea
              data={data}
              keys={[
                { k: "latencyMs", c: "var(--color-chart-1)", label: "Latency" },
                { k: "jitterMs", c: "var(--color-chart-2)", label: "Jitter" },
              ]}
              tipFmt={tipFmt}
            />
          </Section>
          <Section title="Packet loss (%) & bandwidth util (%)">
            <ChartArea
              data={data}
              keys={[
                { k: "packetLossPct", c: "var(--color-chart-3)", label: "Loss %" },
                { k: "bandwidthUtilPct", c: "var(--color-chart-4)", label: "Util %" },
              ]}
              tipFmt={tipFmt}
            />
          </Section>
          <Section title="CPU & memory (%)">
            <ChartArea
              data={data}
              keys={[
                { k: "cpuPct", c: "var(--color-chart-1)", label: "CPU" },
                { k: "memoryPct", c: "var(--color-chart-5)", label: "Memory" },
              ]}
              tipFmt={tipFmt}
            />
          </Section>
          <Section title="Temperature (°C) & optical Rx (dBm)">
            <ChartLine
              data={data}
              keys={[
                { k: "temperatureC", c: "var(--color-chart-3)", label: "Temp" },
                { k: "opticalRxDbm", c: "var(--color-chart-2)", label: "Optical Rx" },
              ]}
              tipFmt={tipFmt}
            />
          </Section>
          <Section title="Interface & CRC errors">
            <ChartArea
              data={data}
              keys={[
                { k: "inputErrors", c: "var(--color-chart-1)", label: "Input" },
                { k: "outputErrors", c: "var(--color-chart-2)", label: "Output" },
                { k: "crcErrors", c: "var(--color-chart-3)", label: "CRC" },
              ]}
              tipFmt={tipFmt}
            />
          </Section>
          <Section title="Security telemetry">
            <ChartArea
              data={data}
              keys={[
                { k: "failedLogins", c: "var(--color-chart-3)", label: "Failed logins" },
                { k: "configChanged", c: "var(--color-chart-4)", label: "Config change" },
                { k: "linkFlaps15m", c: "var(--color-chart-1)", label: "Link flaps" },
              ]}
              tipFmt={tipFmt}
            />
          </Section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Contributing risk factors">
            <ContribFactors score={score} />
          </Section>
          <Section title="Root-cause ranking">
            <RootCauses score={score} />
          </Section>
        </div>

        <Section title="Recommended investigation steps">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground/90">
            {score.recommendedActions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            Reproducible from telemetry input · engine{" "}
            <span className="text-mono">{score.engineType}</span> v
            <span className="text-mono">{score.engineVersion}</span> · last calculated{" "}
            <span className="text-mono">{new Date(score.timestamp).toLocaleTimeString()}</span>.
            Corrective actions require human approval.
          </p>
        </Section>
      </div>
    </div>
  );
}

function tone(score: number, inverted = false): "healthy" | "warning" | "critical" {
  const v = inverted ? 100 - score : score;
  if (v < 30) return "healthy";
  if (v < 60) return "warning";
  return "critical";
}

function ContribFactors({ score }: { score: ReturnType<typeof scoreFn> }) {
  return (
    <div className="space-y-2">
      {score.contributingFactors.slice(0, 8).map((c) => (
        <div key={c.key}>
          <div className="flex items-center justify-between text-sm">
            <span>{c.label}</span>
            <span className="text-mono text-xs">
              {c.risk.toFixed(0)}{" "}
              <span className="text-muted-foreground">× w{c.weight.toFixed(2)}</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full"
              style={{
                width: `${c.risk}%`,
                backgroundColor:
                  c.risk > 60
                    ? "var(--color-status-critical)"
                    : c.risk > 30
                      ? "var(--color-status-warning)"
                      : "var(--color-status-healthy)",
              }}
            />
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{c.reason}</div>
        </div>
      ))}
    </div>
  );
}

function RootCauses({ score }: { score: ReturnType<typeof scoreFn> }) {
  return (
    <div className="space-y-3">
      {score.rootCauseCandidates.map((c, i) => (
        <div key={i} className="surface-elevated p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{labelCause(c.cause)}</div>
            <div className="text-mono text-sm">{c.probability}%</div>
          </div>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
            {c.evidence.map((e, j) => (
              <li key={j}>{e}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function labelCause(c: string) {
  const m: Record<string, string> = {
    "optical-degradation": "Optical-link degradation",
    "router-overheat": "Router overheating",
    "suspicious-config": "Suspicious configuration activity",
    "link-congestion": "Link congestion",
    "cpu-overload": "CPU overload",
    "memory-pressure": "Memory exhaustion",
    "power-instability": "Power instability",
    "interface-failure": "Interface failure",
    stable: "Stable · no correlated cause",
  };
  return m[c] ?? c;
}

// Phantom for inferring score type without re-importing
function scoreFn(_a: unknown, _b: unknown): import("@/lib/orbital/types").ScoreResult {
  return _a as never;
}

const tipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "0.5rem",
  fontSize: "12px",
  color: "var(--color-popover-foreground)",
};

interface ChartKey {
  k: string;
  c: string;
  label: string;
}

function ChartArea({
  data,
  keys,
  tipFmt,
}: {
  data: any[];
  keys: ChartKey[];
  tipFmt: (t: number) => string;
}) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {keys.map((k) => (
              <linearGradient key={k.k} id={`g-${k.k}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={k.c} stopOpacity={0.4} />
                <stop offset="100%" stopColor={k.c} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="var(--color-grid)" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={tipFmt}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
            stroke="var(--color-grid)"
          />
          <YAxis
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
            stroke="var(--color-grid)"
          />
          <Tooltip
            contentStyle={tipStyle}
            labelFormatter={(t) => new Date(t as number).toLocaleString()}
          />
          {keys.map((k) => (
            <Area
              key={k.k}
              type="monotone"
              dataKey={k.k}
              name={k.label}
              stroke={k.c}
              fill={`url(#g-${k.k})`}
              strokeWidth={1.4}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartLine({
  data,
  keys,
  tipFmt,
}: {
  data: any[];
  keys: ChartKey[];
  tipFmt: (t: number) => string;
}) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-grid)" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={tipFmt}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
            stroke="var(--color-grid)"
          />
          <YAxis
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
            stroke="var(--color-grid)"
          />
          <Tooltip
            contentStyle={tipStyle}
            labelFormatter={(t) => new Date(t as number).toLocaleString()}
          />
          {keys.map((k) => (
            <Line
              key={k.k}
              type="monotone"
              dataKey={k.k}
              name={k.label}
              stroke={k.c}
              strokeWidth={1.4}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
