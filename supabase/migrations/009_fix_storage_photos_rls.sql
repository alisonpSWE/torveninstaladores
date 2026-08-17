-- ==============================================================================
-- MIGRAÇÃO DE BANCO: Permissões Completas de Storage para o Bucket 'photos'
-- ==============================================================================

-- 1. Garante que o bucket 'photos' existe e está configurado como público para visualização
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,
  52428800, -- Limite de 50MB por arquivo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];

-- 2. Remove políticas de storage anteriores para evitar conflitos
DROP POLICY IF EXISTS "allow_anon_authenticated_insert_photos" ON storage.objects;
DROP POLICY IF EXISTS "allow_anon_authenticated_select_photos" ON storage.objects;
DROP POLICY IF EXISTS "allow_anon_authenticated_update_photos" ON storage.objects;
DROP POLICY IF EXISTS "allow_admin_delete_photos_storage" ON storage.objects;

-- 3. POLÍTICA DE LEITURA (SELECT): Acesso livre para visualização das fotos da obra
CREATE POLICY "allow_anon_authenticated_select_photos"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'photos');

-- 4. POLÍTICA DE INSERÇÃO (INSERT): Permite upload de fotos de campo e projeto
CREATE POLICY "allow_anon_authenticated_insert_photos"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'photos');

-- 5. POLÍTICA DE ATUALIZAÇÃO (UPDATE): Permite upsert de fotos no bucket 'photos'
CREATE POLICY "allow_anon_authenticated_update_photos"
  ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'photos')
  WITH CHECK (bucket_id = 'photos');

-- 6. POLÍTICA DE EXCLUSÃO (DELETE): Exclusiva para usuários com perfil ADMIN
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
