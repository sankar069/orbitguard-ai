import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Boxes,
  BrainCircuit,
  ChevronLeft,
  Cpu,
  FileText,
  Gauge,
  Info,
  Leaf,
  LogOut,
  Radio,
  Satellite,
  ShieldCheck,
  UserRound,
  Settings,
  ListTree,
} from "lucide-react";
import { useOrbital } from "@/lib/orbital/store";
import { useAuth, roleLabel } from "@/lib/auth/AuthProvider";
import { type ReactNode } from "react";

const nav: { to: string; label: string; icon: typeof Gauge; exact?: boolean }[] = [
  { to: "/console", label: "Mission Overview", icon: Gauge, exact: true },
  { to: "/console/topology", label: "Network Topology", icon: Boxes },
  { to: "/console/devices", label: "Devices", icon: Cpu },
  { to: "/console/incidents", label: "Active Incidents", icon: Activity },
  { to: "/console/predictions", label: "Predictions", icon: Activity },
  { to: "/console/intelligence", label: "Predictive Intelligence", icon: BrainCircuit },
  { to: "/console/copilot", label: "Orbital Copilot", icon: Radio },
  { to: "/console/knowledge", label: "Knowledge Base", icon: FileText },
  { to: "/console/audit", label: "Audit Logs", icon: ListTree as typeof Gauge },
  { to: "/console/sustainability", label: "Sustainability Impact", icon: Leaf },
  { to: "/console/responsible-ai", label: "Responsible AI", icon: ShieldCheck },
  { to: "/console/settings", label: "Settings", icon: Settings as typeof Gauge },
  { to: "/console/about", label: "About", icon: Info },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state, scores, running } = useOrbital();
  const { profile, user, primaryRole, signOut } = useAuth();
  const totalDevices = state.devices.length;
  const offline = state.devices.filter((d) => scores[d.id]?.severity === "offline").length;
  const displayName = profile?.full_name ?? user?.email?.split("@")[0] ?? "Operator";

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-4">
          <div className="relative grid h-8 w-8 place-items-center rounded-md border border-sidebar-border bg-elevated">
            <Satellite className="h-4 w-4 text-primary" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--color-status-healthy)] animate-orbital-pulse" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">OrbitalGuard</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              Mission Console
            </div>
          </div>
        </Link>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          <div className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Operations
          </div>
          {nav.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname.startsWith(item.to) && item.to !== "/console";
            const isHome = item.to === "/console" && pathname === "/console";
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as never}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  active || isHome
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-sidebar-border p-4">
          <div className="surface-elevated p-3">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-mono uppercase tracking-[0.12em]">Engine</span>
              <span
                className={`inline-flex items-center gap-1.5 font-mono ${running ? "text-[var(--color-status-healthy)]" : "text-[var(--color-status-warning)]"}`}
              >
                <span
                  className={`status-dot bg-current ${running ? "animate-orbital-pulse" : ""}`}
                />
                {running ? "live" : "paused"}
              </span>
            </div>
            <div className="mt-2 text-sm">
              <span className="text-mono">{totalDevices - offline}</span>
              <span className="text-muted-foreground"> / {totalDevices} devices online</span>
            </div>
          </div>
          <div className="surface-elevated p-3">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-full border border-border bg-background text-muted-foreground">
                <UserRound className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{displayName}</div>
                <div className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                  {roleLabel(primaryRole)}
                </div>
              </div>
              <button
                onClick={() => {
                  void signOut();
                }}
                title="Sign out"
                className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="border-b border-border bg-background/80 backdrop-blur lg:hidden">
          <Link to="/" className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> Home
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}
