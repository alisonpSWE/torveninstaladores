-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create obras table
CREATE TABLE IF NOT EXISTS public.obras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  id_obra integer UNIQUE NOT NULL,
  cliente text,
  status text,
  telefone text,
  cidade text,
  endereco text,
  link_maps text,
  data_instalacao text,
  instalador text,
  tipo_ligacao text,
  tipo_telhado text,
  inversor_marca text,
  inversor_modelo text,
  potencia_inversor_kw numeric(10, 2),
  modulos_marca text,
  modulos_modelo text,
  potencia_modulo_w numeric(10, 2),
  qtd_modulos integer,
  potencia_total_kwp numeric(10, 2),
  observacoes text,
  link_fotos text
);

-- Create indexes for fast querying and filtering
CREATE INDEX IF NOT EXISTS idx_obras_id_obra ON public.obras (id_obra);
CREATE INDEX IF NOT EXISTS idx_obras_instalador ON public.obras (instalador);
CREATE INDEX IF NOT EXISTS idx_obras_status ON public.obras (status);
CREATE INDEX IF NOT EXISTS idx_obras_cidade ON public.obras (cidade);
CREATE INDEX IF NOT EXISTS idx_obras_created_at ON public.obras (created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated and anon users (for field app display)
CREATE POLICY "allow_read_all" ON public.obras
  FOR SELECT
  USING (true);

-- Allow insert/update/delete for service role / admin
CREATE POLICY "allow_all_service_role" ON public.obras
  FOR ALL
  USING (true)
  WITH CHECK (true);
