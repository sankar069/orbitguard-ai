// Authentication context: session, profile, role.
// Wires supabase.auth.onAuthStateChange and exposes a sign-out helper.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "operator" | "security" | "auditor";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  department: string | null;
  account_status: string;
}

interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  primaryRole: AppRole | null;
  hasRole: (r: AppRole) => boolean;
  hasAny: (rs: AppRole[]) => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

const ROLE_PRIORITY: AppRole[] = ["admin", "manager", "security", "operator", "auditor"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const loadProfileAndRoles = useCallback(async (uid: string) => {
    const [{ data: prof }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((prof as Profile) ?? null);
    setRoles((roleRows ?? []).map((r) => r.role as AppRole));
  }, []);

  useEffect(() => {
    // Set up listener FIRST, then check session
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setRoles([]);
        queryClient.clear();
        return;
      }
      if (sess?.user) {
        // Defer DB calls to avoid deadlocks inside listener
        setTimeout(() => {
          void loadProfileAndRoles(sess.user.id);
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        void loadProfileAndRoles(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfileAndRoles, queryClient]);

  const refresh = useCallback(async () => {
    if (session?.user) await loadProfileAndRoles(session.user.id);
  }, [session, loadProfileAndRoles]);

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }, [queryClient, navigate]);

  const value = useMemo<AuthState>(() => {
    const primaryRole = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? null;
    return {
      loading,
      session,
      user: session?.user ?? null,
      profile,
      roles,
      primaryRole,
      hasRole: (r) => roles.includes(r),
      hasAny: (rs) => rs.some((r) => roles.includes(r)),
      refresh,
      signOut,
    };
  }, [loading, session, profile, roles, refresh, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function roleLabel(role: AppRole | null): string {
  if (!role) return "No role assigned";
  return (
    {
      admin: "Administrator",
      manager: "Operations Manager",
      operator: "Operator",
      security: "Security Analyst",
      auditor: "Auditor",
    } as const
  )[role];
}
