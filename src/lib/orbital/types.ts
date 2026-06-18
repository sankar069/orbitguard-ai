// OrbitalGuard AI — shared types
export type DeviceType =
  | "core-router"
  | "edge-router"
  | "switch"
  | "firewall"
  | "server"
  | "optical-mux";

export type SiteId = "mcc" | "gs-north" | "gs-south" | "dpc" | "boc" | "soc";

export interface Site {
  id: SiteId;
  name: string;
  shortCode: string;
  region: string;
  coord: { x: number; y: number }; // 0..1 normalised topology coords
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  siteId: SiteId;
  vendor: string;
  model: string;
  serial: string;
  firmware: string;
  installedOn: string;
  lastMaintenance: string;
}

export interface Link {
  id: string;
  from: string; // device id
  to: string; // device id
  bandwidthGbps: number;
  primary: boolean;
}

export interface TelemetryPoint {
  t: number; // epoch ms
  latencyMs: number;
  jitterMs: number;
  packetLossPct: number;
  bandwidthUtilPct: number;
  cpuPct: number;
  memoryPct: number;
  temperatureC: number;
  inputErrors: number;
  outputErrors: number;
  crcErrors: number;
  opticalRxDbm: number;
  linkFlaps15m: number;
  failedLogins: number;
  configChanged: 0 | 1;
  powerOk: 0 | 1;
  fanOk: 0 | 1;
  online: 0 | 1;
}

export type FaultType =
  | "optical-degradation"
  | "router-overheat"
  | "suspicious-config"
  | "link-congestion"
  | "cpu-overload"
  | "memory-pressure"
  | "power-instability"
  | "interface-failure";

export interface ActiveFault {
  deviceId: string;
  type: FaultType;
  startedAt: number;
  intensity: number; // 0..1 progresses over time
}

export interface RiskComponent {
  key: string;
  label: string;
  value: number; // current normalised metric
  risk: number; // 0..100
  weight: number; // sums to 1.0 across components
  reason: string;
}

export type Severity = "healthy" | "observe" | "low" | "warning" | "high" | "critical" | "offline";

export interface ScoreResult {
  deviceId: string;
  timestamp: number;
  healthScore: number; // 0..100
  anomalyScore: number; // 0..100
  failureRisk: number; // 0..100 (probability %)
  predictedFailureType: FaultType | "none";
  predictionHorizonMinutes: number;
  confidence: number; // 0..1
  dataQuality: number; // 0..1
  severity: Severity;
  contributingFactors: RiskComponent[];
  rootCauseCandidates: { cause: FaultType | "stable"; probability: number; evidence: string[] }[];
  recommendedActions: string[];
  engineType: "statistical-rules";
  engineVersion: string;
}
