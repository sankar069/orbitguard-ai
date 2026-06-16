// React context owning the synthetic simulation state.
// Single source of truth for devices, telemetry, faults, simulation control.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  appendTick, bootstrap, clearAllFaults, clearFault, injectFault,
  TICK_MS, type SyntheticState,
} from "./synthetic";
import type { FaultType, ScoreResult } from "./types";
import { DEFAULT_WEIGHTS, scoreDevice, type ScoreWeights } from "./scoring";

interface OrbitalContextValue {
  state: SyntheticState;
  scores: Record<string, ScoreResult>;
  weights: ScoreWeights;
  setWeights: (w: ScoreWeights) => void;
  // simulation control
  running: boolean;
  speed: number;
  setSpeed: (s: number) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  // faults
  inject: (deviceId: string, type: FaultType) => void;
  clear: (deviceId: string) => void;
  clearAll: () => void;
}

const Ctx = createContext<OrbitalContextValue | null>(null);

export function OrbitalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SyntheticState>(() => bootstrap(42));
  const [weights, setWeights] = useState<ScoreWeights>(DEFAULT_WEIGHTS);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    setState(prev => appendTick(prev, speed));
  }, [speed]);

  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (!running) return;
    // Real-time interval inversely scaled by speed; clamp to 500ms min.
    const interval = Math.max(500, Math.round(TICK_MS / 20 / speed));
    timerRef.current = window.setInterval(tick, interval);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [running, speed, tick]);

  const scores = useMemo(() => {
    const out: Record<string, ScoreResult> = {};
    for (const d of state.devices) {
      out[d.id] = scoreDevice(d, state.history[d.id], weights);
    }
    return out;
  }, [state, weights]);

  const value: OrbitalContextValue = {
    state, scores, weights, setWeights,
    running, speed, setSpeed,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    reset: () => setState(bootstrap(state.rngSeed)),
    inject: (id, t) => setState(s => injectFault(s, id, t)),
    clear: (id) => setState(s => clearFault(s, id)),
    clearAll: () => setState(s => clearAllFaults(s)),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrbital(): OrbitalContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOrbital must be used inside <OrbitalProvider>");
  return ctx;
}
