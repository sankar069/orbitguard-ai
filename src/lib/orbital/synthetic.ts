// Synthetic mission-network data generator.
// Deterministic given a seed. Builds sites, devices, links, and historical
// per-minute telemetry. Outputs are reproducible from the same seed + inputs.

import type {
  Device,
  Link,
  Site,
  TelemetryPoint,
  ActiveFault,
  FaultType,
  DeviceType,
} from "./types";

/* ---------------- seeded PRNG (mulberry32) ---------------- */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

export const sites: Site[] = [
  {
    id: "mcc",
    name: "Mission Control Centre",
    shortCode: "MCC",
    region: "Bengaluru",
    coord: { x: 0.5, y: 0.5 },
  },
  {
    id: "gs-north",
    name: "Ground Station North",
    shortCode: "GSN",
    region: "Lucknow",
    coord: { x: 0.4, y: 0.18 },
  },
  {
    id: "gs-south",
    name: "Ground Station South",
    shortCode: "GSS",
    region: "Trivandrum",
    coord: { x: 0.42, y: 0.84 },
  },
  {
    id: "dpc",
    name: "Data Processing Centre",
    shortCode: "DPC",
    region: "Hyderabad",
    coord: { x: 0.78, y: 0.42 },
  },
  {
    id: "boc",
    name: "Backup Operations Centre",
    shortCode: "BOC",
    region: "Pune",
    coord: { x: 0.18, y: 0.62 },
  },
  {
    id: "soc",
    name: "Security Operations Centre",
    shortCode: "SOC",
    region: "Bengaluru",
    coord: { x: 0.7, y: 0.7 },
  },
];

const vendors = ["Aurora Networks", "Helios Systems", "Nimbus Optical", "Polaris IT"];
const models: Record<DeviceType, string[]> = {
  "core-router": ["CR-9200", "CR-7100"],
  "edge-router": ["ER-3200", "ER-2800"],
  switch: ["SX-48p", "SX-24p"],
  firewall: ["FG-500", "FG-200"],
  server: ["MX-Compute-2U", "MX-Storage-4U"],
  "optical-mux": ["OM-DWDM-16", "OM-DWDM-8"],
};

interface DeviceSpec {
  type: DeviceType;
  count: number;
}
const layout: Record<string, DeviceSpec[]> = {
  mcc: [
    { type: "core-router", count: 1 },
    { type: "switch", count: 1 },
    { type: "server", count: 1 },
  ],
  "gs-north": [
    { type: "edge-router", count: 1 },
    { type: "optical-mux", count: 1 },
    { type: "switch", count: 1 },
  ],
  "gs-south": [
    { type: "edge-router", count: 1 },
    { type: "optical-mux", count: 1 },
    { type: "switch", count: 1 },
  ],
  dpc: [
    { type: "core-router", count: 1 },
    { type: "server", count: 2 },
  ],
  boc: [
    { type: "edge-router", count: 1 },
    { type: "switch", count: 1 },
  ],
  soc: [
    { type: "firewall", count: 1 },
    { type: "server", count: 1 },
  ],
};

function pad(n: number, w = 2) {
  return String(n).padStart(w, "0");
}

export function buildDevices(rng: Rng): Device[] {
  const devices: Device[] = [];
  for (const site of sites) {
    const specs = layout[site.id];
    let idx = 0;
    for (const spec of specs) {
      for (let i = 0; i < spec.count; i++) {
        idx++;
        const id = `${site.shortCode}-${spec.type.split("-")[0].slice(0, 3).toUpperCase()}${pad(idx)}`;
        const vendor = vendors[Math.floor(rng() * vendors.length)];
        const modelList = models[spec.type];
        const model = modelList[Math.floor(rng() * modelList.length)];
        const installedDays = 200 + Math.floor(rng() * 900);
        const installedOn = new Date(Date.now() - installedDays * 86400000).toISOString();
        const lastMaintenance = new Date(
          Date.now() - Math.floor(rng() * 90) * 86400000,
        ).toISOString();
        devices.push({
          id,
          name: id,
          type: spec.type,
          siteId: site.id,
          vendor,
          model,
          serial: `SN${Math.floor(rng() * 1e8)
            .toString(36)
            .toUpperCase()}`,
          firmware: `${4 + Math.floor(rng() * 4)}.${Math.floor(rng() * 12)}.${Math.floor(rng() * 30)}`,
          installedOn,
          lastMaintenance,
        });
      }
    }
  }
  return devices;
}

export function buildLinks(devices: Device[]): Link[] {
  // Each non-MCC site connects its router/firewall to MCC core; DPC also connects to MCC.
  const mccCore = devices.find((d) => d.siteId === "mcc" && d.type === "core-router")!;
  const links: Link[] = [];
  let lid = 0;
  for (const d of devices) {
    if (d.id === mccCore.id) continue;
    if (d.type === "edge-router" || d.type === "core-router" || d.type === "firewall") {
      links.push({
        id: `L${pad(++lid, 3)}`,
        from: mccCore.id,
        to: d.id,
        bandwidthGbps: d.type === "core-router" ? 100 : 40,
        primary: true,
      });
    }
  }
  // Backup mesh: GSN↔GSS, BOC↔DPC
  const gsn = devices.find((d) => d.siteId === "gs-north" && d.type === "edge-router")!;
  const gss = devices.find((d) => d.siteId === "gs-south" && d.type === "edge-router")!;
  const dpc = devices.find((d) => d.siteId === "dpc" && d.type === "core-router")!;
  const boc = devices.find((d) => d.siteId === "boc" && d.type === "edge-router")!;
  links.push({
    id: `L${pad(++lid, 3)}`,
    from: gsn.id,
    to: gss.id,
    bandwidthGbps: 40,
    primary: false,
  });
  links.push({
    id: `L${pad(++lid, 3)}`,
    from: boc.id,
    to: dpc.id,
    bandwidthGbps: 40,
    primary: false,
  });
  // Site-local links (switch ↔ router/server)
  for (const site of sites) {
    const siteDevices = devices.filter((d) => d.siteId === site.id);
    const sw = siteDevices.find((d) => d.type === "switch");
    if (!sw) continue;
    for (const d of siteDevices) {
      if (d.id === sw.id) continue;
      links.push({
        id: `L${pad(++lid, 3)}`,
        from: sw.id,
        to: d.id,
        bandwidthGbps: 10,
        primary: true,
      });
    }
  }
  return links;
}

/* ---------------- telemetry generation ---------------- */

interface DeviceBaseline {
  latency: number;
  jitter: number;
  loss: number;
  util: number;
  cpu: number;
  mem: number;
  temp: number;
  opticalRx: number;
  errBase: number;
}

export function makeBaseline(d: Device, rng: Rng): DeviceBaseline {
  const isCore = d.type === "core-router";
  const isOptical = d.type === "optical-mux";
  const isServer = d.type === "server";
  return {
    latency: isCore ? 4 + rng() * 2 : 8 + rng() * 5,
    jitter: 0.4 + rng() * 0.6,
    loss: 0.02 + rng() * 0.08,
    util: isCore ? 35 + rng() * 15 : 25 + rng() * 20,
    cpu: isServer ? 28 + rng() * 12 : 18 + rng() * 12,
    mem: isServer ? 55 + rng() * 12 : 35 + rng() * 12,
    temp: 35 + rng() * 6,
    opticalRx: isOptical ? -6 - rng() * 2 : -10 - rng() * 4,
    errBase: 0.02 + rng() * 0.05,
  };
}

// Diurnal load multiplier — daily traffic cycle, weekday vs weekend.
function loadMultiplier(t: number): number {
  const d = new Date(t);
  const hour = d.getUTCHours() + d.getUTCMinutes() / 60;
  // peak at ~10:00 and 19:00 UTC, low at 03:00
  const a = Math.sin(((hour - 4) / 24) * Math.PI * 2);
  const b = Math.sin(((hour - 13) / 24) * Math.PI * 2);
  const base = 0.7 + 0.25 * Math.max(a, 0) + 0.35 * Math.max(b, 0);
  const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6 ? 0.78 : 1;
  return base * weekend;
}

// Apply fault progression to baseline. Intensity scales 0..1 over time.
function applyFault(point: TelemetryPoint, fault: ActiveFault, base: DeviceBaseline) {
  const k = fault.intensity;
  switch (fault.type) {
    case "optical-degradation":
      point.opticalRxDbm = base.opticalRx - 6 * k;
      point.crcErrors += Math.round(40 * k + Math.random() * 10 * k);
      point.packetLossPct = base.loss + 4 * k;
      point.latencyMs += 12 * k;
      point.linkFlaps15m += Math.round(3 * k);
      break;
    case "router-overheat":
      point.temperatureC = base.temp + 25 * k;
      point.cpuPct = Math.min(99, base.cpu + 45 * k);
      point.memoryPct = Math.min(99, base.mem + 25 * k);
      point.fanOk = k > 0.55 ? 0 : 1;
      break;
    case "suspicious-config":
      point.failedLogins += Math.round(8 * k);
      point.configChanged = k > 0.4 ? 1 : 0;
      point.bandwidthUtilPct = Math.min(98, base.util + 30 * k);
      break;
    case "link-congestion":
      point.bandwidthUtilPct = Math.min(99, base.util + 50 * k);
      point.latencyMs += 20 * k;
      point.packetLossPct += 1.2 * k;
      point.jitterMs += 2 * k;
      break;
    case "cpu-overload":
      point.cpuPct = Math.min(99, base.cpu + 55 * k);
      point.latencyMs += 8 * k;
      break;
    case "memory-pressure":
      point.memoryPct = Math.min(99, base.mem + 35 * k);
      point.cpuPct += 15 * k;
      break;
    case "power-instability":
      point.powerOk = k > 0.6 ? 0 : 1;
      point.linkFlaps15m += Math.round(2 * k);
      break;
    case "interface-failure":
      point.inputErrors += Math.round(80 * k);
      point.outputErrors += Math.round(60 * k);
      point.online = k > 0.85 ? 0 : 1;
      break;
  }
}

export function generatePoint(
  d: Device,
  base: DeviceBaseline,
  t: number,
  rngSeed: number,
  fault?: ActiveFault,
): TelemetryPoint {
  const rng = mulberry32(rngSeed + Math.floor(t / 60000) + d.id.length * 7);
  const load = loadMultiplier(t);
  const noise = (mag: number) => (rng() - 0.5) * mag;

  const point: TelemetryPoint = {
    t,
    latencyMs: Math.max(0.5, base.latency * load + noise(1.2)),
    jitterMs: Math.max(0.05, base.jitter * (0.7 + 0.6 * load) + noise(0.2)),
    packetLossPct: Math.max(0, base.loss * (0.6 + 0.8 * load) + noise(0.05)),
    bandwidthUtilPct: Math.min(99, base.util * load + noise(4)),
    cpuPct: Math.min(99, base.cpu * (0.7 + 0.6 * load) + noise(3)),
    memoryPct: Math.min(99, base.mem + noise(2)),
    temperatureC: base.temp + load * 4 + noise(0.6),
    inputErrors: Math.max(0, Math.round(base.errBase * 10 * load + noise(2))),
    outputErrors: Math.max(0, Math.round(base.errBase * 8 * load + noise(2))),
    crcErrors: Math.max(0, Math.round(noise(1))),
    opticalRxDbm: base.opticalRx + noise(0.25),
    linkFlaps15m: rng() < 0.005 ? 1 : 0,
    failedLogins: rng() < 0.02 ? Math.floor(rng() * 2) : 0,
    configChanged: rng() < 0.003 ? 1 : 0,
    powerOk: 1,
    fanOk: 1,
    online: 1,
  };
  if (fault) applyFault(point, fault, base);
  return point;
}

/* ---------------- bootstrap ---------------- */

export interface SyntheticState {
  rngSeed: number;
  devices: Device[];
  links: Link[];
  baselines: Record<string, DeviceBaseline>;
  // ring buffer of last N points per device
  history: Record<string, TelemetryPoint[]>;
  // currently active injected faults
  faults: ActiveFault[];
  generatedAt: number;
}

export const HISTORY_POINTS = 240; // ~4 hours @ 1/min
export const TICK_MS = 60_000; // logical minute per tick

export function bootstrap(seed = 42): SyntheticState {
  const rng = mulberry32(seed);
  const devices = buildDevices(rng);
  const links = buildLinks(devices);
  const baselines: Record<string, DeviceBaseline> = {};
  const history: Record<string, TelemetryPoint[]> = {};
  const now = Date.now();
  const start = now - (HISTORY_POINTS - 1) * TICK_MS;
  for (const d of devices) {
    baselines[d.id] = makeBaseline(d, rng);
    const arr: TelemetryPoint[] = [];
    for (let i = 0; i < HISTORY_POINTS; i++) {
      const t = start + i * TICK_MS;
      arr.push(generatePoint(d, baselines[d.id], t, seed, undefined));
    }
    history[d.id] = arr;
  }
  return { rngSeed: seed, devices, links, baselines, history, faults: [], generatedAt: now };
}

export function appendTick(state: SyntheticState, simSpeed = 1): SyntheticState {
  const now = Date.now();
  const next: SyntheticState = {
    ...state,
    history: { ...state.history },
    faults: [...state.faults],
  };

  // progress faults — intensity grows toward 1 over ~12 simulated minutes (faster with simSpeed)
  next.faults = next.faults.map((f) => {
    const elapsed = (now - f.startedAt) / 1000;
    const k = Math.min(1, elapsed / (90 / simSpeed));
    return { ...f, intensity: k };
  });

  for (const d of state.devices) {
    const buf = state.history[d.id];
    const last = buf[buf.length - 1];
    const tNew = last.t + TICK_MS;
    const fault = next.faults.find((f) => f.deviceId === d.id);
    const p = generatePoint(d, state.baselines[d.id], tNew, state.rngSeed, fault);
    const newBuf = buf.length >= HISTORY_POINTS ? [...buf.slice(1), p] : [...buf, p];
    next.history[d.id] = newBuf;
  }
  return next;
}

export function injectFault(
  state: SyntheticState,
  deviceId: string,
  type: FaultType,
): SyntheticState {
  // Replace any existing fault on this device
  const faults = state.faults.filter((f) => f.deviceId !== deviceId);
  faults.push({ deviceId, type, startedAt: Date.now(), intensity: 0.01 });
  return { ...state, faults };
}

export function clearFault(state: SyntheticState, deviceId: string): SyntheticState {
  return { ...state, faults: state.faults.filter((f) => f.deviceId !== deviceId) };
}

export function clearAllFaults(state: SyntheticState): SyntheticState {
  return { ...state, faults: [] };
}

export const FAULT_TYPES: { id: FaultType; label: string }[] = [
  { id: "optical-degradation", label: "Optical-link degradation" },
  { id: "router-overheat", label: "Router overheating" },
  { id: "suspicious-config", label: "Suspicious configuration activity" },
  { id: "link-congestion", label: "Link congestion" },
  { id: "cpu-overload", label: "CPU overload" },
  { id: "memory-pressure", label: "Memory exhaustion" },
  { id: "power-instability", label: "Power instability" },
  { id: "interface-failure", label: "Interface failure" },
];
