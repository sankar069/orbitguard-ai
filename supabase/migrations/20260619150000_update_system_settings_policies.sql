-- Explicitly revoke access from anon
REVOKE ALL ON public.system_settings FROM anon;

-- Ensure authenticated users have the necessary grants for RLS to even evaluate updates
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them clearly
DROP POLICY IF EXISTS "settings read" ON public.system_settings;
DROP POLICY IF EXISTS "settings write admin" ON public.system_settings;

-- 1. Anonymous users cannot read or modify (no policies for anon, and grants revoked above)

-- 2. Authenticated ordinary users may read settings only where intended (all authenticated can read)
CREATE POLICY "settings read authenticated" 
  ON public.system_settings FOR SELECT 
  TO authenticated 
  USING (true);

-- 3 & 4. Only users with the intended administrator role may modify settings
CREATE POLICY "settings insert admin" 
  ON public.system_settings FOR INSERT 
  TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "settings update admin" 
  ON public.system_settings FOR UPDATE 
  TO authenticated 
  USING (public.has_role(auth.uid(), 'admin')) 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "settings delete admin" 
  ON public.system_settings FOR DELETE 
  TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

