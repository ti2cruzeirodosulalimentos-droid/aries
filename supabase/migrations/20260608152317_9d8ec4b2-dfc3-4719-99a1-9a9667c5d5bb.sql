
CREATE POLICY "Personal le suas fotos evolucao" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'evolucao-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Personal envia fotos evolucao" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evolucao-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Personal atualiza fotos evolucao" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'evolucao-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Personal deleta fotos evolucao" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'evolucao-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);
