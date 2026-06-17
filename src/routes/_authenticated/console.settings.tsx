import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/orbital/ui";
import { useAuth, roleLabel } from "@/lib/auth/AuthProvider";
import { Settings, Shield, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/console/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, user, primaryRole } = useAuth();

  return (
    <div className="flex flex-col h-full min-h-screen pb-12">
      <PageHeader 
        eyebrow="Mission Configuration"
        title="Settings & Profile"
        description="Manage your operator profile, role assignments, and system preferences."
      />

      <div className="p-6 lg:p-8 flex-1 max-w-4xl">
        <div className="grid gap-6">
          <Section title="Operator Profile">
            <div className="surface-elevated rounded-lg border border-border p-6 flex items-start gap-6">
              <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center border border-border shrink-0">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-foreground">{profile?.full_name ?? "Operator"}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="mt-4 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{roleLabel(primaryRole)}</span>
                </div>
              </div>
            </div>
          </Section>

          <Section title="AI Provider Status">
            <div className="surface-elevated rounded-lg border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-foreground">Active Provider</h4>
                  <p className="text-sm text-muted-foreground">The AI engine currently driving predictive intelligence and copilot.</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-status-healthy)] bg-[var(--color-status-healthy)]/10 px-3 py-1 text-xs font-medium text-[var(--color-status-healthy)]">
                  <span className="status-dot bg-current animate-orbital-pulse" /> Demonstration Grounded Provider
                </span>
              </div>
              <div className="bg-accent/50 p-4 rounded-md text-sm border border-border">
                <strong>IBM Granite integration is planned but is not currently connected.</strong>
                <p className="mt-1 text-muted-foreground">The current copilot uses a demonstration grounded provider over synthetic telemetry and the seeded knowledge base. Real IBM integration will be activated in a future phase.</p>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
