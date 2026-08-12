-- ==============================================================================
-- MIGRAÇÃO DE SEGURANÇA RLS: Política de Visibilidade para Instaladores
-- ==============================================================================

-- 1. Garante que o Row Level Security (RLS) está ativado na tabela obras
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

-- 2. Remove políticas de SELECT permissivas anteriores se existirem
DROP POLICY IF EXISTS "allow_read_all" ON public.obras;
DROP POLICY IF EXISTS "allow_read_installer_active_obras" ON public.obras;

-- 3. Cria a política de SELECT com Lista Branca Estrita (USING com IN)
-- O aplicativo só enxerga registros que estão nos estágios de análise.
-- Obras em 'Vistoria Solicitada' ou concluídas são ocultadas automaticamente pelo PostgreSQL.
CREATE POLICY "allow_read_installer_active_obras" ON public.obras
  FOR SELECT
  TO anon, authenticated
  USING (
    status IN ('Documentação em Análise', 'Em Análise Técnica')
  );

-- 4. Mantém acesso total para a chave de serviço (Server / Admin / Service Role)
-- Necessário para que os Webhooks e rotas de ETL (QStash / Vercel) continuem inserindo e atualizando qualquer status.
DROP POLICY IF EXISTS "allow_all_service_role" ON public.obras;
CREATE POLICY "allow_all_service_role" ON public.obras
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
