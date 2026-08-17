-- ==============================================================================
-- MIGRAÇÃO DE BANCO: Autenticação, Perfis, Roles e Automation Trigger (AuthN/AuthZ)
-- ==============================================================================

-- 1. CRIAÇÃO DO ENUM DE CARGOS DO SISTEMA
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('instalador', 'escritorio', 'admin');
  END IF;
END $$;

-- 2. CRIAÇÃO DA TABELA DE PERFIS DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome_completo TEXT,
  role public.app_role NOT NULL DEFAULT 'instalador',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilita Row Level Security (RLS) na tabela perfis
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE SEGURANÇA (RLS) NA TABELA PERFIS
-- Permissão de Leitura (SELECT): O usuário autenticado só pode ler o próprio perfil
DROP POLICY IF EXISTS "Usuários podem ler o próprio perfil" ON public.perfis;
CREATE POLICY "Usuários podem ler o próprio perfil"
  ON public.perfis
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Permissão de Atualização (UPDATE): O usuário só pode editar o próprio nome/perfil
DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON public.perfis;
CREATE POLICY "Usuários podem atualizar o próprio perfil"
  ON public.perfis
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin & Service Role total access
DROP POLICY IF EXISTS "Service Role possui acesso total aos perfis" ON public.perfis;
CREATE POLICY "Service Role possui acesso total aos perfis"
  ON public.perfis
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. FUNÇÃO E TRIGGER AUTOMÁTICO DE CRIAÇÃO DE PERFIL
-- Esta função intercepta a criação de um usuário em auth.users e gera o perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis (id, email, nome_completo, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'instalador'::public.app_role)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome_completo = COALESCE(EXCLUDED.nome_completo, public.perfis.nome_completo);

  RETURN NEW;
END;
$$;

-- Associa a função handle_new_user ao evento de INSERT na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
