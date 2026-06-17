// /reset-password — set a new password after recovery email.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, Satellite } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password · OrbitalGuard AI" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase recovery emails arrive with a session already established
    // (or as a hash fragment that the JS client consumes). Wait briefly.
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      navigate({ to: "/console", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 hud-radial" aria-hidden />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-md border border-border bg-elevated">
              <Satellite className="h-4 w-4 text-primary" />
            </div>
            <div className="text-sm font-semibold">OrbitalGuard AI</div>
          </Link>
          <div className="surface-panel p-6">
            <h1 className="mb-4 font-display text-xl font-semibold">Set a new password</h1>
            {!ready ? (
              <div className="rounded-md border border-border bg-elevated p-4 text-sm text-muted-foreground">
                Waiting for recovery session… open this page from the password reset email you received.
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <PassField label="New password" value={password} onChange={setPassword} />
                <PassField label="Confirm password" value={confirm} onChange={setConfirm} />
                {error && (
                  <div className="rounded-md border border-[var(--color-status-critical)]/40 bg-[var(--color-status-critical)]/10 px-3 py-2 text-xs text-[var(--color-status-critical)]">
                    {error}
                  </div>
                )}
                <button
                  type="submit" disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Update password
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PassField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="password" required minLength={8}
          value={value} onChange={e => onChange(e.target.value)}
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 pl-8 text-sm outline-none focus:border-[var(--color-ring)]"
        />
      </div>
    </label>
  );
}
