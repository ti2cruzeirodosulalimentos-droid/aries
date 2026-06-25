
CREATE POLICY "personal reads own aluno fotos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'aluno-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "personal uploads own aluno fotos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'aluno-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "personal updates own aluno fotos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'aluno-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "personal deletes own aluno fotos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'aluno-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);
