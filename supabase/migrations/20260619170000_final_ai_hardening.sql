-- Explicitly revoke modification privileges from Data API for ordinary users
REVOKE INSERT, UPDATE, DELETE ON public.ai_audit_logs FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.ai_rate_limits FROM authenticated, anon;
