-- ==============================================================================
-- MIGRAÇÃO DE BANCO: Tabela de Metadados de Fotos da Obra (obra_photos)
-- ==============================================================================

-- 1. Criação da Tabela obra_photos
CREATE TABLE IF NOT EXISTS public.obra_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  id_obra INTEGER NOT NULL REFERENCES public.obras(id_obra) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  content_type TEXT DEFAULT 'image/jpeg',
  size_bytes INTEGER,
  public_url TEXT NOT NULL
);

-- 2. Índice de Desempenho para busca ultra-rápida por ID da Obra
CREATE INDEX IF NOT EXISTS idx_obra_photos_id_obra ON public.obra_photos(id_obra);

-- 3. Habilitação do Row Level Security (RLS)
ALTER TABLE public.obra_photos ENABLE ROW LEVEL SECURITY;

-- 4. Remoção de políticas antigas se existirem
DROP POLICY IF EXISTS "allow_all_anon_authenticated_photos" ON public.obra_photos;
DROP POLICY IF EXISTS "allow_all_service_role_photos" ON public.obra_photos;

-- 5. Política para Clientes (anon / authenticated): Leitura e Inserção de Fotos no App
CREATE POLICY "allow_all_anon_authenticated_photos" ON public.obra_photos
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Política para Service Role (Admin / Servidor Backend)
CREATE POLICY "allow_all_service_role_photos" ON public.obra_photos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
