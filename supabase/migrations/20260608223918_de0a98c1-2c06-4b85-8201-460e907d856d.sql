
ALTER TABLE public.exercicios
  ADD COLUMN IF NOT EXISTS gif_url text,
  ADD COLUMN IF NOT EXISTS musculos_secundarios text,
  ADD COLUMN IF NOT EXISTS nivel text,
  ADD COLUMN IF NOT EXISTS categoria text;

-- Garantir índice por nome para lookups
CREATE INDEX IF NOT EXISTS idx_exercicios_nome ON public.exercicios (lower(nome));
CREATE INDEX IF NOT EXISTS idx_exercicios_grupo ON public.exercicios (grupo_muscular);

-- Política já cobre is_publico=true (independente de created_by), apenas reforçamos
DROP POLICY IF EXISTS "Ver exercicios publicos ou proprios" ON public.exercicios;
CREATE POLICY "Ver exercicios publicos ou proprios"
  ON public.exercicios FOR SELECT
  TO authenticated
  USING (is_publico = true OR created_by = auth.uid());
