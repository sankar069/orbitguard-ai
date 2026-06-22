-- Add missing SELECT grants and admin read policies for AI tables
-- Also fix system_settings update grant

GRANT SELECT ON public.ai_audit_logs TO authenticated;
GRANT SELECT ON public.ai_rate_limits TO authenticated;

-- Explicitly revoke modification privileges from Data API for ordinary users
REVOKE INSERT, UPDATE, DELETE ON public.ai_audit_logs FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.ai_rate_limits FROM authenticated, anon;

-- Allow authenticated users to attempt UPDATE on system_settings
-- (RLS will restrict actual updates to the admin role)
GRANT SELECT, UPDATE ON public.system_settings TO authenticated;

-- Policies for admin to read
DROP POLICY IF EXISTS "Admin can view all AI audit logs" ON public.ai_audit_logs;
CREATE POLICY "Admin can view all AI audit logs" 
    ON public.ai_audit_logs FOR SELECT 
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin can view all AI rate limits" ON public.ai_rate_limits;
CREATE POLICY "Admin can view all AI rate limits" 
    ON public.ai_rate_limits FOR SELECT 
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Remove the insecure RPC if it exists
DROP FUNCTION IF EXISTS public.insert_ai_audit_log;
