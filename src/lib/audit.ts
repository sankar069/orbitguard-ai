// Convenience helper for recording audit log entries.
// The audit_logs RLS policy allows any authenticated user to insert
// rows where actor_id = auth.uid() or NULL.
import { supabase } from "@/integrations/supabase/client";

export interface AuditEntry {
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  old_value?: unknown;
  new_value?: unknown;
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const { data: u } = await supabase.auth.getUser();
    const user = u.user;
    await supabase.from("audit_logs").insert({
      actor_id: user?.id ?? null,
      actor_email: user?.email ?? null,
      action: entry.action,
      entity_type: entry.entity_type ?? null,
      entity_id: entry.entity_id ?? null,
      description: entry.description ?? null,
      metadata: (entry.metadata ?? null) as never,
      old_value: (entry.old_value ?? null) as never,
      new_value: (entry.new_value ?? null) as never,
    });
  } catch (e) {
    // Audit logging is best-effort; never break the user flow.
    console.warn("[audit] failed", e);
  }
}
