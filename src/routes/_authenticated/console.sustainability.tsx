import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useOrbital } from "@/lib/orbital/store";
import { PageHeader, Section, StatCard } from "@/components/orbital/ui";

export const Route = createFileRoute("/_authenticated/console/sustainability")({
  head: () => ({ meta: [{ title: "Sustainability Impact · OrbitalGuard" }] }),
  component: SustainabilityPage,
});

interface Assumptions {
  avgDeviceWeightKg: number;
  embodiedKgCO2PerDevice: number;
  outageCostPerMinute: number;
  monthsLifeExtensionPerIntervention: number;
  verifiedInterventionRate: number; // 0..1
  avgEnergyKwhPerDevicePerDay: number;
}

const DEFAULTS: Assumptions = {
  avgDeviceWeightKg: 18,
  embodiedKgCO2PerDevice: 320,
  outageCostPerMinute: 4500,
  monthsLifeExtensionPerIntervention: 6,
  verifiedInterventionRate: 0.4,
  avgEnergyKwhPerDevicePerDay: 4.2,
};

export function SustainabilityPage() {
  const { state, scores } = useOrbital();
  const [a, setA] = useState<Assumptions>(DEFAULTS);

  const interventions = useMemo(
    () => Object.values(scores).filter((s) => s.failureRisk >= 45).length,
    [scores],
  );
  const verifiedInterventions = interventions * a.verifiedInterventionRate;
  const downtimeAvoidedMin = verifiedInterventions * 12;
  const downtimeCostAvoided = downtimeAvoidedMin * a.outageCostPerMinute;
  const replacementsAvoided = verifiedInterventions * 0.6;
  const eWasteAvoidedKg = replacementsAvoided * a.avgDeviceWeightKg;
  const co2AvoidedKg = replacementsAvoided * a.embodiedKgCO2PerDevice;
  const lifeExtensionMonths = verifiedInterventions * a.monthsLifeExtensionPerIntervention;
  const monitoredEnergyKwh = state.devices.length * a.avgEnergyKwhPerDevicePerDay;

  return (
    <div>
      <PageHeader
        eyebrow="Sustainability"
        title="Sustainability impact"
        description="Prototype estimates derived from current scoring outputs and editable assumptions. Estimates are not verified facts."
      >
        <span className="chip">SDG 9 · SDG 12</span>
      </PageHeader>

      <div className="space-y-6 p-6 lg:p-8">
        <div className="surface-panel border-l-2 border-[var(--color-status-observe)] p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Prototype estimate.</strong> Values below are
          calculated from the configurable assumptions and the live count of devices currently
          flagged for intervention. Edit any assumption to recalculate immediately.
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Active interventions"
            value={interventions}
            sub={`${verifiedInterventions.toFixed(1)} estimated verified`}
          />
          <StatCard
            label="Downtime potentially avoided"
            value={`${downtimeAvoidedMin.toFixed(0)} min`}
            tone="primary"
          />
          <StatCard
            label="Replacements potentially avoided"
            value={replacementsAvoided.toFixed(1)}
            tone="primary"
          />
          <StatCard
            label="e-Waste avoidance"
            value={`${eWasteAvoidedKg.toFixed(0)} kg`}
            tone="healthy"
          />
          <StatCard
            label="Embodied CO₂ avoidance"
            value={`${co2AvoidedKg.toFixed(0)} kg`}
            tone="healthy"
          />
          <StatCard
            label="Lifetime extension"
            value={`${lifeExtensionMonths.toFixed(0)} mo`}
            sub="across fleet"
          />
          <StatCard
            label="Outage cost avoided"
            value={`₹${(downtimeCostAvoided / 1000).toFixed(0)}k`}
            sub="estimate"
          />
          <StatCard
            label="Daily monitored energy"
            value={`${monitoredEnergyKwh.toFixed(0)} kWh`}
            sub={`${state.devices.length} devices`}
          />
        </div>

        <Section title="Assumptions">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Slider
              label="Average device weight"
              suffix=" kg"
              min={1}
              max={60}
              step={1}
              value={a.avgDeviceWeightKg}
              onChange={(v) => setA({ ...a, avgDeviceWeightKg: v })}
            />
            <Slider
              label="Embodied CO₂ per device"
              suffix=" kg"
              min={50}
              max={1000}
              step={10}
              value={a.embodiedKgCO2PerDevice}
              onChange={(v) => setA({ ...a, embodiedKgCO2PerDevice: v })}
            />
            <Slider
              label="Outage cost per minute"
              suffix=" ₹"
              min={500}
              max={20000}
              step={100}
              value={a.outageCostPerMinute}
              onChange={(v) => setA({ ...a, outageCostPerMinute: v })}
            />
            <Slider
              label="Life extension per intervention"
              suffix=" mo"
              min={1}
              max={24}
              step={1}
              value={a.monthsLifeExtensionPerIntervention}
              onChange={(v) => setA({ ...a, monthsLifeExtensionPerIntervention: v })}
            />
            <Slider
              label="Verified intervention rate"
              suffix=""
              min={0.05}
              max={1}
              step={0.05}
              value={a.verifiedInterventionRate}
              onChange={(v) => setA({ ...a, verifiedInterventionRate: v })}
            />
            <Slider
              label="Energy per device per day"
              suffix=" kWh"
              min={0.5}
              max={20}
              step={0.1}
              value={a.avgEnergyKwhPerDevicePerDay}
              onChange={(v) => setA({ ...a, avgEnergyKwhPerDevicePerDay: v })}
            />
          </div>
          <button
            onClick={() => setA(DEFAULTS)}
            className="mt-4 rounded-md border border-border bg-elevated px-3 py-2 text-xs hover:bg-accent"
          >
            Reset assumptions
          </button>
        </Section>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix: string;
}) {
  return (
    <div className="surface-elevated p-3">
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="text-mono">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-[var(--color-primary)]"
      />
    </div>
  );
}
