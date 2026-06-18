// Transparent statistical scoring engine.
// Every score is derived from the device's recent telemetry history using
// rolling means, rolling standard deviations, z-scores, and weighted risk
// components. No random outputs; reproducible from the same input.

import type {
  Device,
  FaultType,
  RiskComponent,
  ScoreResult,
  Severity,
  TelemetryPoint,
} from "./types";

export const ENGINE_VERSION = "stat-rules-0.1.0";

/* ---------------- statistics ---------------- */

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function stdDev(xs: number[], m?: number): number {
  if (xs.length < 2) return 0;
  const mu = m ?? mean(xs);
  let s = 0;
  for (const x of xs) s += (x - mu) ** 2;
  return Math.sqrt(s / (xs.length - 1));
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** Map raw value to a 0..100 risk via piecewise linear bands. */
function band(value: number, healthy: number, warning: number, critical: number): number {
  if (value <= healthy) return 0;
  if (value <= warning) return ((value - healthy) / (warning - healthy)) * 50;
  if (value <= critical) return 50 + ((value - warning) / (critical - warning)) * 40;
  return Math.min(100, 90 + ((value - critical) / critical) * 10);
}

/** Reverse-band for "lower is worse" metrics (e.g. optical Rx in dBm). */
function reverseBand(value: number, healthy: number, warning: number, critical: number): number {
  if (value >= healthy) return 0;
  if (value >= warning) return ((healthy - value) / (healthy - warning)) * 50;
  if (value >= critical) return 50 + ((warning - value) / (warning - critical)) * 40;
  return Math.min(100, 90 + ((critical - value) / Math.abs(critical)) * 10);
}

/* ---------------- scoring weights (configurable) ---------------- */

export interface ScoreWeights {
  latency: number;
  jitter: number;
  loss: number;
  cpu: number;
  memory: number;
  temperature: number;
  errors: number;
  optical: number;
  linkFlaps: number;
  security: number;
  power: number;
  config: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  latency: 0.12,
  jitter: 0.05,
  loss: 0.13,
  cpu: 0.11,
  memory: 0.08,
  temperature: 0.1,
  errors: 0.1,
  optical: 0.1,
  linkFlaps: 0.06,
  security: 0.07,
  power: 0.05,
  config: 0.03,
};

/* ---------------- main scorer ---------------- */

export function scoreDevice(
  device: Device,
  history: TelemetryPoint[],
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): ScoreResult {
  const now = history[history.length - 1];
  const window = history.slice(-30); // last 30 minutes
  const baseline = history.slice(-180, -30); // 30..180 min ago for baseline
  const validBaseline = baseline.length >= 30 ? baseline : history.slice(0, -1);

  // Offline check
  if (now.online === 0) {
    return offlineResult(device, now.t);
  }

  // helpers for z-score against baseline
  const zOf = (selector: (p: TelemetryPoint) => number) => {
    const vals = validBaseline.map(selector);
    const mu = mean(vals);
    const sd = stdDev(vals, mu) || 0.0001;
    return { z: (selector(now) - mu) / sd, mu, sd };
  };

  // Recent averages (denoise current spike with 5-min rolling)
  const recent5 = history.slice(-5);
  const avg = (sel: (p: TelemetryPoint) => number) => mean(recent5.map(sel));

  const latencyAvg = avg((p) => p.latencyMs);
  const jitterAvg = avg((p) => p.jitterMs);
  const lossAvg = avg((p) => p.packetLossPct);
  const cpuAvg = avg((p) => p.cpuPct);
  const memAvg = avg((p) => p.memoryPct);
  const tempAvg = avg((p) => p.temperatureC);
  const utilAvg = avg((p) => p.bandwidthUtilPct);
  const errSum = recent5.reduce((s, p) => s + p.inputErrors + p.outputErrors + p.crcErrors, 0);
  const opticalAvg = avg((p) => p.opticalRxDbm);
  const flapsSum = history.slice(-15).reduce((s, p) => s + p.linkFlaps15m, 0);
  const failedLoginSum = history.slice(-10).reduce((s, p) => s + p.failedLogins, 0);
  const configChanges = history.slice(-15).reduce((s, p) => s + p.configChanged, 0);

  // Component risks
  const components: RiskComponent[] = [];

  const zLat = zOf((p) => p.latencyMs);
  components.push({
    key: "latency",
    label: "Latency",
    value: round(latencyAvg, 2),
    risk: clamp(Math.max(band(latencyAvg, 10, 25, 60), absZRisk(zLat.z)), 0, 100),
    weight: weights.latency,
    reason: `5-min avg ${latencyAvg.toFixed(1)}ms (z=${zLat.z.toFixed(2)} vs 3h baseline)`,
  });

  components.push({
    key: "jitter",
    label: "Jitter",
    value: round(jitterAvg, 2),
    risk: band(jitterAvg, 1, 4, 10),
    weight: weights.jitter,
    reason: `avg ${jitterAvg.toFixed(2)}ms`,
  });

  const zLoss = zOf((p) => p.packetLossPct);
  components.push({
    key: "loss",
    label: "Packet loss",
    value: round(lossAvg, 3),
    risk: clamp(Math.max(band(lossAvg, 0.2, 1.0, 3.0), absZRisk(zLoss.z)), 0, 100),
    weight: weights.loss,
    reason: `${lossAvg.toFixed(2)}% (z=${zLoss.z.toFixed(2)})`,
  });

  const zCpu = zOf((p) => p.cpuPct);
  components.push({
    key: "cpu",
    label: "CPU",
    value: round(cpuAvg, 1),
    risk: clamp(Math.max(band(cpuAvg, 55, 75, 92), absZRisk(zCpu.z)), 0, 100),
    weight: weights.cpu,
    reason: `${cpuAvg.toFixed(1)}% (z=${zCpu.z.toFixed(2)})`,
  });

  components.push({
    key: "memory",
    label: "Memory",
    value: round(memAvg, 1),
    risk: band(memAvg, 70, 85, 95),
    weight: weights.memory,
    reason: `${memAvg.toFixed(1)}%`,
  });

  const zTemp = zOf((p) => p.temperatureC);
  components.push({
    key: "temperature",
    label: "Temperature",
    value: round(tempAvg, 1),
    risk: clamp(Math.max(band(tempAvg, 45, 60, 75), absZRisk(zTemp.z)), 0, 100),
    weight: weights.temperature,
    reason: `${tempAvg.toFixed(1)}°C (z=${zTemp.z.toFixed(2)})`,
  });

  components.push({
    key: "errors",
    label: "Interface errors",
    value: errSum,
    risk: band(errSum, 5, 40, 150),
    weight: weights.errors,
    reason: `${errSum} errors in 5 min`,
  });

  components.push({
    key: "optical",
    label: "Optical Rx",
    value: round(opticalAvg, 2),
    risk: reverseBand(opticalAvg, -12, -16, -20),
    weight: weights.optical,
    reason: `${opticalAvg.toFixed(2)} dBm`,
  });

  components.push({
    key: "linkFlaps",
    label: "Link flaps",
    value: flapsSum,
    risk: band(flapsSum, 0, 2, 6),
    weight: weights.linkFlaps,
    reason: `${flapsSum} flaps in 15 min`,
  });

  components.push({
    key: "security",
    label: "Auth security",
    value: failedLoginSum,
    risk: band(failedLoginSum, 0, 3, 10),
    weight: weights.security,
    reason: `${failedLoginSum} failed logins (10 min)`,
  });

  components.push({
    key: "power",
    label: "Power & cooling",
    value: now.powerOk * 10 + now.fanOk,
    risk: (now.powerOk === 0 ? 80 : 0) + (now.fanOk === 0 ? 40 : 0),
    weight: weights.power,
    reason:
      now.powerOk === 0
        ? "Power fault reported"
        : now.fanOk === 0
          ? "Fan fault reported"
          : "Nominal",
  });

  components.push({
    key: "config",
    label: "Config integrity",
    value: configChanges,
    risk: band(configChanges, 0, 1, 3),
    weight: weights.config,
    reason: `${configChanges} unscheduled change(s)`,
  });

  // Weighted operational risk
  const totalWeight = components.reduce((s, c) => s + c.weight, 0) || 1;
  const weightedRisk = components.reduce((s, c) => s + c.risk * c.weight, 0) / totalWeight;
  const healthScore = clamp(100 - weightedRisk, 0, 100);

  // Anomaly score: max abs z-score across key features, scaled
  const zMax = Math.max(Math.abs(zLat.z), Math.abs(zLoss.z), Math.abs(zCpu.z), Math.abs(zTemp.z));
  const anomalyScore = clamp(zMax * 25, 0, 100);

  // Failure risk: blend of weighted risk + anomaly + trend
  const trendSlope = simpleSlope(window.map((p) => p.latencyMs + p.cpuPct + p.packetLossPct * 20));
  const trendBoost = clamp(trendSlope * 6, 0, 30);
  const failureRisk = clamp(weightedRisk * 0.55 + anomalyScore * 0.3 + trendBoost, 0, 100);

  // Data quality
  const dataQuality = clamp(
    1 - (validBaseline.length < 60 ? 0.3 : 0) - (recent5.length < 5 ? 0.2 : 0),
    0.4,
    1,
  );

  // Confidence: more abnormal components + better data → higher confidence.
  const abnormalCount = components.filter((c) => c.risk >= 40).length;
  const confidence = clamp(
    0.35 + abnormalCount * 0.1 + dataQuality * 0.25 + (zMax > 3 ? 0.15 : 0),
    0.2,
    0.95,
  );

  // Severity
  const severity = severityFromScore(healthScore, failureRisk);

  // Root-cause ranking
  const rootCauseCandidates = rankRootCauses(components, {
    opticalAvg,
    latencyAvg,
    lossAvg,
    utilAvg,
    cpuAvg,
    tempAvg,
    flapsSum,
    failedLoginSum,
    configChanges,
    errSum,
  });

  const predictedFailureType =
    rootCauseCandidates[0]?.cause === "stable"
      ? "none"
      : (rootCauseCandidates[0]?.cause as FaultType);

  const predictionHorizonMinutes =
    failureRisk > 85 ? 15 : failureRisk > 70 ? 30 : failureRisk > 45 ? 60 : 120;

  const recommendedActions = recommendActions(predictedFailureType, severity, device);

  return {
    deviceId: device.id,
    timestamp: now.t,
    healthScore: round(healthScore, 1),
    anomalyScore: round(anomalyScore, 1),
    failureRisk: round(failureRisk, 1),
    predictedFailureType,
    predictionHorizonMinutes,
    confidence: round(confidence, 2),
    dataQuality: round(dataQuality, 2),
    severity,
    contributingFactors: components.sort((a, b) => b.risk * b.weight - a.risk * a.weight),
    rootCauseCandidates,
    recommendedActions,
    engineType: "statistical-rules",
    engineVersion: ENGINE_VERSION,
  };
}

function offlineResult(device: Device, t: number): ScoreResult {
  return {
    deviceId: device.id,
    timestamp: t,
    healthScore: 0,
    anomalyScore: 100,
    failureRisk: 100,
    predictedFailureType: "interface-failure",
    predictionHorizonMinutes: 0,
    confidence: 0.6,
    dataQuality: 0.5,
    severity: "offline",
    contributingFactors: [],
    rootCauseCandidates: [
      { cause: "interface-failure", probability: 80, evidence: ["Device reporting offline"] },
    ],
    recommendedActions: [
      "Verify device power and console access via out-of-band management.",
      "Inspect upstream link status and recent configuration changes.",
    ],
    engineType: "statistical-rules",
    engineVersion: ENGINE_VERSION,
  };
}

function absZRisk(z: number): number {
  const a = Math.abs(z);
  if (a < 2) return 0;
  if (a < 3) return 30 + (a - 2) * 20;
  if (a < 4) return 50 + (a - 3) * 25;
  return Math.min(100, 75 + (a - 4) * 8);
}

function simpleSlope(xs: number[]): number {
  const n = xs.length;
  if (n < 4) return 0;
  const xMean = (n - 1) / 2;
  const yMean = mean(xs);
  let num = 0,
    den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (xs[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export function severityFromScore(health: number, failureRisk: number): Severity {
  if (failureRisk >= 85) return "critical";
  if (failureRisk >= 70 || health < 50) return "high";
  if (failureRisk >= 45 || health < 70) return "warning";
  if (failureRisk >= 21 || health < 85) return "observe";
  return "healthy";
}

interface RankInputs {
  opticalAvg: number;
  latencyAvg: number;
  lossAvg: number;
  utilAvg: number;
  cpuAvg: number;
  tempAvg: number;
  flapsSum: number;
  failedLoginSum: number;
  configChanges: number;
  errSum: number;
}

function rankRootCauses(
  components: RiskComponent[],
  v: RankInputs,
): ScoreResult["rootCauseCandidates"] {
  const r = (k: string) => components.find((c) => c.key === k)?.risk ?? 0;
  const scores: { cause: FaultType | "stable"; raw: number; evidence: string[] }[] = [];

  scores.push({
    cause: "optical-degradation",
    raw: r("optical") * 0.6 + r("errors") * 0.25 + v.flapsSum * 5 + r("loss") * 0.15,
    evidence: [
      `Optical Rx ${v.opticalAvg.toFixed(2)} dBm`,
      `${v.errSum} interface/CRC errors in 5 min`,
      `${v.flapsSum} link flaps in 15 min`,
    ],
  });
  scores.push({
    cause: "router-overheat",
    raw: r("temperature") * 0.6 + r("cpu") * 0.25 + r("power") * 0.3,
    evidence: [`Temperature ${v.tempAvg.toFixed(1)}°C`, `CPU ${v.cpuAvg.toFixed(1)}%`],
  });
  scores.push({
    cause: "suspicious-config",
    raw: r("security") * 0.55 + r("config") * 0.45 + (v.utilAvg > 70 ? 10 : 0),
    evidence: [
      `${v.failedLoginSum} failed logins`,
      `${v.configChanges} unscheduled config change(s)`,
    ],
  });
  scores.push({
    cause: "link-congestion",
    raw: (v.utilAvg > 75 ? (v.utilAvg - 75) * 4 : 0) + r("latency") * 0.4 + r("loss") * 0.3,
    evidence: [
      `Bandwidth util ${v.utilAvg.toFixed(0)}%`,
      `Latency avg ${v.latencyAvg.toFixed(1)}ms`,
    ],
  });
  scores.push({
    cause: "cpu-overload",
    raw: r("cpu") * 0.7 + r("latency") * 0.15,
    evidence: [`CPU avg ${v.cpuAvg.toFixed(1)}%`],
  });

  const totalSignal = scores.reduce((s, x) => s + Math.max(0, x.raw), 0);
  if (totalSignal < 8) {
    return [
      {
        cause: "stable",
        probability: 95,
        evidence: ["No correlated risk signals above threshold."],
      },
    ];
  }
  const ranked = scores
    .map((s) => ({
      cause: s.cause,
      probability: clamp((s.raw / totalSignal) * 100, 0, 99),
      evidence: s.evidence,
    }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 4)
    .map((s) => ({ ...s, probability: round(s.probability, 0) }));
  return ranked;
}

function recommendActions(cause: FaultType | "none", severity: Severity, device: Device): string[] {
  if (cause === "none") {
    return ["Continue monitoring. No corrective action required."];
  }
  const base: string[] = [];
  switch (cause) {
    case "optical-degradation":
      base.push(
        "Inspect optical transceiver Rx levels and clean fibre connectors on the affected interface.",
        "Validate availability of backup optical path before any service-affecting work.",
        "Open a maintenance ticket; do not swap transceivers without manager approval.",
      );
      break;
    case "router-overheat":
      base.push(
        "Verify chassis intake/exhaust airflow and fan status on the device.",
        "Reduce non-essential CPU load and check ambient rack temperature.",
        "Schedule on-site inspection if temperature continues to rise.",
      );
      break;
    case "suspicious-config":
      base.push(
        "Freeze configuration changes on this device and disable the involved account session.",
        "Notify the Security Operations Centre; preserve syslog and audit evidence.",
        "Verify whether the change matches an approved change-management window.",
      );
      break;
    case "link-congestion":
      base.push(
        "Validate current traffic mix and identify top talkers on the affected interface.",
        "Consider reroute via the secondary path during peak window.",
      );
      break;
    case "cpu-overload":
      base.push(
        "Identify the top CPU process; investigate control-plane policing thresholds.",
        "Postpone non-essential scheduled tasks until CPU returns to baseline.",
      );
      break;
    case "memory-pressure":
      base.push(
        "Capture process-memory snapshot; plan a controlled restart during the next maintenance window.",
      );
      break;
    case "power-instability":
      base.push("Verify PSU status, redundant feed availability, and UPS health for the rack.");
      break;
    case "interface-failure":
      base.push(
        "Verify interface link state; engage on-call for physical inspection if persistent.",
      );
      break;
  }
  if (severity === "critical" || severity === "high") {
    base.unshift(
      "Request Operations Manager approval before any corrective action that may interrupt traffic.",
    );
  }
  base.push(`Reference SOPs for ${device.type.replace("-", " ")} (knowledge base).`);
  return base;
}

function round(n: number, p = 0): number {
  const m = 10 ** p;
  return Math.round(n * m) / m;
}

export function severityColor(s: Severity): string {
  switch (s) {
    case "healthy":
      return "var(--color-status-healthy)";
    case "observe":
      return "var(--color-status-observe)";
    case "warning":
      return "var(--color-status-warning)";
    case "high":
      return "var(--color-status-warning)";
    case "critical":
      return "var(--color-status-critical)";
    case "offline":
      return "var(--color-status-offline)";
    default:
      return "var(--color-status-healthy)";
  }
}

export function severityLabel(s: Severity): string {
  return (
    {
      healthy: "Healthy",
      observe: "Observe",
      low: "Low risk",
      warning: "Warning",
      high: "High risk",
      critical: "Critical",
      offline: "Offline",
    }[s] || "Unknown"
  );
}
