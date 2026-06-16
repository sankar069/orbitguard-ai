import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/orbital/AppShell";

export const Route = createFileRoute("/console")({
  head: () => ({
    meta: [
      { title: "Mission Console · OrbitalGuard AI" },
      { name: "description", content: "Live mission console: monitor devices, inspect telemetry, predict failures, and walk through demonstration scenarios." },
    ],
  }),
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
