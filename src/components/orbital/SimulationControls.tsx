// Simulation control bar — start/pause/reset, speed slider, fault injection.
import { useState } from "react";
import { Pause, Play, RotateCcw, Zap, X } from "lucide-react";
import { useOrbital } from "@/lib/orbital/store";
import { FAULT_TYPES } from "@/lib/orbital/synthetic";
import type { FaultType } from "@/lib/orbital/types";

export function SimulationControls() {
  const { state, running, speed, setSpeed, start, pause, reset, inject, clearAll } = useOrbital();
  const [device, setDevice] = useState<string>(state.devices[0]?.id ?? "");
  const [fault, setFault] = useState<FaultType>("optical-degradation");

  function onInject() {
    if (!device) return;
    inject(device, fault);
  }

  return (
    <div className="surface-panel flex flex-wrap items-center gap-3 p-3">
      <div className="flex items-center gap-1.5">
        {running ? (
          <button onClick={pause} className="ctrl"><Pause className="h-3.5 w-3.5" /> Pause</button>
        ) : (
          <button onClick={start} className="ctrl"><Play className="h-3.5 w-3.5" /> Resume</button>
        )}
        <button onClick={reset} className="ctrl"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
      </div>

      <div className="flex items-center gap-2 px-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Speed</span>
        <input
          type="range" min={1} max={10} step={1}
          value={speed}
          onChange={e => setSpeed(Number(e.target.value))}
          className="h-1.5 w-28 cursor-pointer appearance-none rounded-full bg-border accent-[var(--color-primary)]"
          aria-label="Simulation speed"
        />
        <span className="text-mono w-6 text-xs">{speed}×</span>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <select value={device} onChange={e => setDevice(e.target.value)} className="ctrl-input">
          {state.devices.map(d => <option key={d.id} value={d.id}>{d.id}</option>)}
        </select>
        <select value={fault} onChange={e => setFault(e.target.value as FaultType)} className="ctrl-input">
          {FAULT_TYPES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <button onClick={onInject} className="ctrl bg-primary text-primary-foreground border-primary hover:opacity-90">
          <Zap className="h-3.5 w-3.5" /> Inject fault
        </button>
        {state.faults.length > 0 && (
          <button onClick={clearAll} className="ctrl">
            <X className="h-3.5 w-3.5" /> Clear {state.faults.length} fault{state.faults.length > 1 ? "s" : ""}
          </button>
        )}
      </div>

      <style>{`
        .ctrl {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.375rem 0.7rem; border-radius: 0.4rem;
          background: var(--color-elevated); border: 1px solid var(--color-border);
          font-size: 0.75rem; color: var(--color-foreground); transition: background 0.15s;
        }
        .ctrl:hover { background: var(--color-accent); }
        .ctrl-input {
          padding: 0.375rem 0.6rem; border-radius: 0.4rem;
          background: var(--color-elevated); border: 1px solid var(--color-border);
          font-size: 0.75rem; color: var(--color-foreground);
          font-family: var(--font-mono);
        }
      `}</style>
    </div>
  );
}
