-- Enforce strict append-only behavior for audit logs
REVOKE UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.ai_audit_logs FROM anon, authenticated;
