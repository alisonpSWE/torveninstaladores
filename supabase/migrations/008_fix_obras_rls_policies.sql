-- ==============================================================================
-- MIGRAÇÃO DE BANCO: Correção de Políticas RLS na Tabela obras
-- ==============================================================================

-- 1. Remove políticas anteriores de SELECT na tabela obras
DROP POLICY IF EXISTS "allow_read_all" ON public.obras;
DROP POLICY IF EXISTS "allow_read_installer_active_obras" ON public.obras;
DROP POLICY IF EXISTS "allow_admin_all_obras" ON public.obras;
DROP POLICY IF EXISTS "allow_admin_read_all_obras" ON public.obras;
DROP POLICY IF EXISTS "allow_installer_read_active_obras" ON public.obras;

-- 2. POLÍTICA PARA ADMINISTRADORES: Acesso Total (SELECT, INSERT, UPDATE, DELETE) em TODAS as obras
-- Permite ao Admin visualizar e gerenciar qualquer obra, inclusive importadas manualmente e com 'Vistoria Solicitada'
CREATE POLICY "allow_admin_all_obras" ON public.obras
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE public.perfis.id = auth.uid()
      AND public.perfis.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE public.perfis.id = auth.uid()
      AND public.perfis.role = 'admin'
    )
  );

-- 3. POLÍTICA PARA INSTALADORES: Leitura estrita de obras ativas em andamento
-- Garante que técnicos de campo vejam apenas obras nos estágios operacionais
CREATE POLICY "allow_installer_read_active_obras" ON public.obras
  FOR SELECT
  TO authenticated, anon
  USING (
    status IN ('Documentação em Análise', 'Em Análise Técnica')
  );

-- 4. POLÍTICA PARA SERVICE ROLE (Webhooks QStash, Rotas de Importação no Servidor)
DROP POLICY IF EXISTS "allow_all_service_role" ON public.obras;
CREATE POLICY "allow_all_service_role" ON public.obras
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
