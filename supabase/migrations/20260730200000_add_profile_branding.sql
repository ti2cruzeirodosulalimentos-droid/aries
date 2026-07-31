-- Marca própria por personal: logo e nome de marca usados na capa dos PDFs.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS brand_name text;

-- Bucket "logos" (privado, mesmo padrão de aluno-fotos) — cada personal só
-- acessa a própria pasta (primeiro segmento do path = auth.uid()).
CREATE POLICY "personal reads own logo" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "personal uploads own logo" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "personal updates own logo" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "personal deletes own logo" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
