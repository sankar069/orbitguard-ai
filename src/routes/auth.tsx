// /auth — Sign in, sign up, Google OAuth, forgot password.
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail, Lock, ArrowRight, Satellite, KeyRound } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { recordAudit } from "@/lib/audit";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in · OrbitalGuard AI" },
      { name: "description", content: "Sign in to the OrbitalGuard AI mission console." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // If already signed in, bounce to console
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: search.redirect ?? "/console", replace: true });
    });
  }, [navigate, search.redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        await recordAudit({ action: "auth.sign_in", description: `Sign in: ${email}` });
        navigate({ to: search.redirect ?? "/console", replace: true });
      } else if (mode === "signup") {
        if (password.length < 8) throw new Error("Password must be at least 8 characters.");
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/console`,
            data: { full_name: name.trim() || email.split("@")[0] },
          },
        });
        if (error) throw error;
        setInfo("Account created. If email confirmation is enabled, check your inbox to verify your address, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo("If an account exists for that address, a password reset email has been sent.");
      }
    } catch (err) {
      setError(safeAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setError(null);
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate({ to: search.redirect ?? "/console", replace: true });
    } catch (err) {
      setError(safeAuthError(err));
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 hud-radial" aria-hidden />
      <div className="absolute inset-0 hud-grid opacity-30" aria-hidden />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
            <div className="relative grid h-9 w-9 place-items-center rounded-md border border-border bg-elevated">
              <Satellite className="h-4 w-4 text-primary" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--color-status-healthy)] animate-orbital-pulse" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">OrbitalGuard AI</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Mission Console Access
              </div>
            </div>
          </Link>

          <div className="surface-panel p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h1 className="font-display text-xl font-semibold">
                {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}
              </h1>
              <div className="chip">{mode === "forgot" ? "Recovery" : "Mission"}</div>
            </div>

            {mode !== "forgot" && (
              <>
                <button
                  type="button"
                  onClick={googleSignIn}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-elevated px-3 py-2 text-sm font-medium transition hover:bg-accent disabled:opacity-60"
                >
                  <GoogleGlyph /> Continue with Google
                </button>
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">or email</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              </>
            )}

            <form onSubmit={submit} className="space-y-3">
              {mode === "signup" && (
                <Field icon={<Satellite className="h-3.5 w-3.5" />} label="Full name">
                  <input
                    autoComplete="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="auth-input"
                    placeholder="A. Sharma"
                  />
                </Field>
              )}
              <Field icon={<Mail className="h-3.5 w-3.5" />} label="Email">
                <input
                  type="email" required autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="auth-input" placeholder="operator@example.com"
                />
              </Field>
              {mode !== "forgot" && (
                <Field icon={<Lock className="h-3.5 w-3.5" />} label="Password">
                  <input
                    type="password" required minLength={8}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="auth-input" placeholder="At least 8 characters"
                  />
                </Field>
              )}

              {error && (
                <div className="rounded-md border border-[var(--color-status-critical)]/40 bg-[var(--color-status-critical)]/10 px-3 py-2 text-xs text-[var(--color-status-critical)]">
                  {error}
                </div>
              )}
              {info && (
                <div className="rounded-md border border-[var(--color-status-healthy)]/40 bg-[var(--color-status-healthy)]/10 px-3 py-2 text-xs text-[var(--color-status-healthy)]">
                  {info}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset email"}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              {mode === "signin" ? (
                <>
                  <button onClick={() => { setMode("signup"); setError(null); setInfo(null); }} className="hover:text-foreground">
                    Create account
                  </button>
                  <button onClick={() => { setMode("forgot"); setError(null); setInfo(null); }} className="inline-flex items-center gap-1 hover:text-foreground">
                    <KeyRound className="h-3 w-3" /> Forgot password
                  </button>
                </>
              ) : (
                <button onClick={() => { setMode("signin"); setError(null); setInfo(null); }} className="hover:text-foreground">
                  ← Back to sign in
                </button>
              )}
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By signing in you accept that all actions are recorded in the immutable audit log.
          </p>
        </div>
      </div>

      <style>{`
        .auth-input {
          width: 100%;
          background: var(--color-elevated);
          border: 1px solid var(--color-border);
          border-radius: 0.4rem;
          padding: 0.5rem 0.7rem 0.5rem 1.9rem;
          font-size: 0.85rem;
          color: var(--color-foreground);
          outline: none;
          transition: border-color 0.15s;
          font-family: var(--font-sans);
        }
        .auth-input:focus { border-color: var(--color-ring); }
      `}</style>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        {children}
      </div>
    </label>
  );
}

function GoogleGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.46c-.24 1.4-1.7 4.08-5.46 4.08-3.28 0-5.96-2.72-5.96-6.08s2.68-6.08 5.96-6.08c1.86 0 3.12.79 3.83 1.47l2.6-2.52C16.83 3.36 14.66 2.5 12 2.5 6.74 2.5 2.5 6.74 2.5 12S6.74 21.5 12 21.5c6.9 0 9.5-4.85 9.5-7.5 0-.51-.05-.9-.13-1.3H12z"/>
    </svg>
  );
}

function safeAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  // Hide internal details but preserve common user-facing causes.
  if (/invalid login credentials/i.test(raw)) return "Email or password is incorrect.";
  if (/user already registered/i.test(raw))   return "An account with this email already exists. Try signing in.";
  if (/rate limit|too many/i.test(raw))       return "Too many attempts. Try again in a few minutes.";
  if (/email.*confirm/i.test(raw))            return "Please confirm your email address before signing in.";
  return raw.replace(/AuthApiError:\s*/, "");
}
