-- ==============================================================================
-- MIGRAÇÃO DE BANCO: Políticas de Exclusão Rígidas (Hard Delete) para Admins
-- ==============================================================================

-- 1. POLÍTICAS DE RLS NA TABELA obra_photos
-- Ajusta políticas existentes para não permitir DELETE indiscriminado
DROP POLICY IF EXISTS "allow_all_anon_authenticated_photos" ON public.obra_photos;
DROP POLICY IF EXISTS "allow_read_obra_photos" ON public.obra_photos;
DROP POLICY IF EXISTS "allow_insert_obra_photos" ON public.obra_photos;
DROP POLICY IF EXISTS "allow_admin_delete_obra_photos" ON public.obra_photos;

-- Leitura: aberta para usuários autenticados e anônimos (PWA)
CREATE POLICY "allow_read_obra_photos"
  ON public.obra_photos
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Inserção: aberta para usuários autenticados e anônimos (Upload de campo e projeto)
CREATE POLICY "allow_insert_obra_photos"
  ON public.obra_photos
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Exclusão (DELETE): Permitida ESTRITAMENTE para usuários com role 'admin'
CREATE POLICY "allow_admin_delete_obra_photos"
  ON public.obra_photos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE public.perfis.id = auth.uid()
      AND public.perfis.role = 'admin'
    )
  );

-- Service Role possui permissão irrestrita
DROP POLICY IF EXISTS "allow_service_role_all_obra_photos" ON public.obra_photos;
CREATE POLICY "allow_service_role_all_obra_photos"
  ON public.obra_photos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 2. POLÍTICA DE RLS NO STORAGE DO SUPABASE (storage.objects)
-- Permite exclusão de arquivos no bucket 'photos' apenas para ADMINS
DROP POLICY IF EXISTS "allow_admin_delete_photos_storage" ON storage.objects;
CREATE POLICY "allow_admin_delete_photos_storage"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND EXISTS (
      SELECT 1 FROM public.perfis
      WHERE public.perfis.id = auth.uid()
      AND public.perfis.role = 'admin'
    )
  );
