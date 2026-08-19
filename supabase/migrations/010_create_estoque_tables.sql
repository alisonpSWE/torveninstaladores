-- ==============================================================================
-- MIGRAÇÃO DE BANCO: Gestão de Estoque e Consumo de Materiais por Obra
-- ==============================================================================

-- 1. Criação da Tabela de Catálogo e Saldo de Produtos (public.estoque_produtos)
CREATE TABLE IF NOT EXISTS public.estoque_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  unidade TEXT NOT NULL, -- ex: 'un', 'm', 'par', 'barra'
  quantidade_saldo NUMERIC NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_estoque_produtos_categoria ON public.estoque_produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_estoque_produtos_codigo ON public.estoque_produtos(codigo);

-- 2. Criação da Tabela de Consumo de Materiais na Obra (public.obra_materiais)
CREATE TABLE IF NOT EXISTS public.obra_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_obra INTEGER NOT NULL REFERENCES public.obras(id_obra) ON DELETE CASCADE,
  id_produto UUID NOT NULL REFERENCES public.estoque_produtos(id) ON DELETE RESTRICT,
  quantidade_utilizada NUMERIC NOT NULL CHECK (quantidade_utilizada > 0),
  observacoes TEXT,
  registrado_por UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de performance para busca por obra
CREATE INDEX IF NOT EXISTS idx_obra_materiais_id_obra ON public.obra_materiais(id_obra);
CREATE INDEX IF NOT EXISTS idx_obra_materiais_id_produto ON public.obra_materiais(id_produto);

-- 3. Função e Trigger para Atualização Automática do Saldo de Estoque
CREATE OR REPLACE FUNCTION public.fn_atualizar_saldo_estoque_materiais()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Subtrai a quantidade consumida do saldo do produto
    UPDATE public.estoque_produtos
    SET quantidade_saldo = quantidade_saldo - NEW.quantidade_utilizada
    WHERE id = NEW.id_produto;
    RETURN NEW;

  ELSIF (TG_OP = 'UPDATE') THEN
    -- Ajusta o saldo caso a quantidade utilizada seja alterada
    UPDATE public.estoque_produtos
    SET quantidade_saldo = quantidade_saldo + OLD.quantidade_utilizada - NEW.quantidade_utilizada
    WHERE id = NEW.id_produto;
    RETURN NEW;

  ELSIF (TG_OP = 'DELETE') THEN
    -- Estorna a quantidade utilizada de volta ao estoque
    UPDATE public.estoque_produtos
    SET quantidade_saldo = quantidade_saldo + OLD.quantidade_utilizada
    WHERE id = OLD.id_produto;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger disparado após INSERT, UPDATE ou DELETE em obra_materiais
DROP TRIGGER IF EXISTS trg_atualizar_saldo_obra_materiais ON public.obra_materiais;
CREATE TRIGGER trg_atualizar_saldo_obra_materiais
  AFTER INSERT OR UPDATE OR DELETE ON public.obra_materiais
  FOR EACH ROW EXECUTE FUNCTION public.fn_atualizar_saldo_estoque_materiais();

-- 4. Configuração de Row Level Security (RLS)
ALTER TABLE public.estoque_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obra_materiais ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas anteriores
DROP POLICY IF EXISTS "allow_read_estoque_produtos" ON public.estoque_produtos;
DROP POLICY IF EXISTS "allow_admin_manage_estoque_produtos" ON public.estoque_produtos;
DROP POLICY IF EXISTS "allow_service_role_estoque_produtos" ON public.estoque_produtos;

DROP POLICY IF EXISTS "allow_read_obra_materiais" ON public.obra_materiais;
DROP POLICY IF EXISTS "allow_insert_obra_materiais" ON public.obra_materiais;
DROP POLICY IF EXISTS "allow_admin_manage_obra_materiais" ON public.obra_materiais;
DROP POLICY IF EXISTS "allow_service_role_obra_materiais" ON public.obra_materiais;

-- Políticas para estoque_produtos:
-- Leitura aberta para usuários autenticados e anônimos (PWA)
CREATE POLICY "allow_read_estoque_produtos"
  ON public.estoque_produtos FOR SELECT
  TO anon, authenticated
  USING (true);

-- Modificações (INSERT, UPDATE, DELETE) exclusivas para Administradores
CREATE POLICY "allow_admin_manage_estoque_produtos"
  ON public.estoque_produtos FOR ALL
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

-- Políticas para obra_materiais:
-- Leitura aberta para todos
CREATE POLICY "allow_read_obra_materiais"
  ON public.obra_materiais FOR SELECT
  TO anon, authenticated
  USING (true);

-- Inserção de consumo por técnicos e instaladores autenticados
CREATE POLICY "allow_insert_obra_materiais"
  ON public.obra_materiais FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Exclusão / Edição de registros de consumo restrita a Administradores
CREATE POLICY "allow_admin_manage_obra_materiais"
  ON public.obra_materiais FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE public.perfis.id = auth.uid()
      AND public.perfis.role = 'admin'
    )
  );

-- Service Role irrestrito
CREATE POLICY "allow_service_role_estoque_produtos"
  ON public.estoque_produtos FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "allow_service_role_obra_materiais"
  ON public.obra_materiais FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 5. Carga Inicial de Dados (Seed Checklist C-001 a C-020)
INSERT INTO public.estoque_produtos (codigo, nome, categoria, unidade, quantidade_saldo, estoque_minimo)
VALUES
  -- Categoria: Fixação e Estrutura
  ('C-001', 'Perfil de Alumínio para Telhado (Barra 2.4m)', 'Fixação', 'barra', 120, 20),
  ('C-002', 'Gancho para Telha Cerâmica/Colonial', 'Fixação', 'un', 350, 50),
  ('C-003', 'Parafuso Estrutural / Telha Fibrocimento (Haste M10)', 'Fixação', 'un', 280, 40),
  ('C-004', 'Terminal Intermediário (Mid Clamp) 30-40mm', 'Fixação', 'un', 500, 80),
  ('C-005', 'Terminal Final (End Clamp) 30-40mm', 'Fixação', 'un', 250, 40),
  ('C-006', 'Junção / Emenda de Perfil de Alumínio', 'Fixação', 'un', 160, 30),
  ('C-007', 'Grampo de Aterramento para Painéis Fotovoltaicos', 'Fixação', 'un', 300, 50),

  -- Categoria: Cabos Elétricos
  ('C-008', 'Cabo Solar 4mm² Vermelho 1.8kV (Rolo 100m)', 'Cabos', 'm', 850, 150),
  ('C-009', 'Cabo Solar 4mm² Preto 1.8kV (Rolo 100m)', 'Cabos', 'm', 820, 150),
  ('C-010', 'Cabo Solar 6mm² Vermelho 1.8kV', 'Cabos', 'm', 450, 100),
  ('C-011', 'Cabo Solar 6mm² Preto 1.8kV', 'Cabos', 'm', 420, 100),
  ('C-012', 'Cabo de Cobre Nu 10mm² para Aterramento', 'Cabos', 'm', 260, 50),

  -- Categoria: Conectores
  ('C-013', 'Par de Conectores MC4 (Macho e Fêmea 1500V)', 'Conectores', 'par', 400, 60),
  ('C-014', 'Conector MC4 Tipo Y / Derivação 2 em 1', 'Conectores', 'par', 65, 15),

  -- Categoria: Caixas e Proteção
  ('C-015', 'String Box CC 2 Entradas / 2 Saídas 1000V', 'Caixas', 'un', 24, 5),
  ('C-016', 'Quadro de Distribuição CA com Disjuntor + DPS', 'Caixas', 'un', 18, 4),
  ('C-017', 'Disjuntor Bipolar Curva C 32A', 'Caixas', 'un', 45, 10),
  ('C-018', 'Disjuntor Tripolar Curva C 50A', 'Caixas', 'un', 30, 8),
  ('C-019', 'Dispositivo de Proteção contra Surtos (DPS) CA 275V 40kA', 'Caixas', 'un', 60, 15),

  -- Categoria: Acessórios e Eletrodutos
  ('C-020', 'Eletroduto Corrugado Reforçado 3/4" (Rolo 50m)', 'Acessórios', 'm', 600, 100)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  categoria = EXCLUDED.categoria,
  unidade = EXCLUDED.unidade;
