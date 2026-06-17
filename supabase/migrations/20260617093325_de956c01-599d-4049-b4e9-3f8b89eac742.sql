
CREATE POLICY "kb read auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kb-documents');
CREATE POLICY "kb upload auth" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kb-documents' AND owner = auth.uid());
CREATE POLICY "kb update owner" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kb-documents' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "kb delete owner/admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kb-documents' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin')));
