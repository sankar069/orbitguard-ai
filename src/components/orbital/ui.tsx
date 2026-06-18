// Small reusable presentational primitives for the console.

import { type ReactNode } from "react";
import type { Severity } from "@/lib/orbital/types";
import { severityLabel } from "@/lib/orbital/scoring";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border bg-background px-6 py-6 lg:px-8">
      <div>
        {eyebrow && (
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "default",
  mono = true,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "healthy" | "warning" | "critical" | "primary";
  mono?: boolean;
}) {
  const toneClass = {
    default: "text-foreground",
    healthy: "text-[var(--color-status-healthy)]",
    warning: "text-[var(--color-status-warning)]",
    critical: "text-[var(--color-status-critical)]",
    primary: "text-primary",
  }[tone];
  return (
    <div className="surface-panel p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1.5 font-display text-2xl font-semibold ${mono ? "tabular-nums" : ""} ${toneClass}`}
      >
        {value}
      </div>
      {sub != null && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const colorVar = {
    healthy: "var(--color-status-healthy)",
    observe: "var(--color-status-observe)",
    low: "var(--color-status-observe)",
    warning: "var(--color-status-warning)",
    high: "var(--color-status-warning)",
    critical: "var(--color-status-critical)",
    offline: "var(--color-status-offline)",
  }[severity];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]"
      style={{ color: colorVar }}
    >
      <span className="status-dot bg-current" />
      {severityLabel(severity)}
    </span>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="surface-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
