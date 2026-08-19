-- Adiciona coluna de endereçamento físico (localização no almoxarifado/galpão)
ALTER TABLE public.estoque_produtos 
ADD COLUMN IF NOT EXISTS localizacao TEXT DEFAULT 'Almoxarifado Geral';

-- Atualiza localizações iniciais padrão para os itens C-001 a C-020
UPDATE public.estoque_produtos SET localizacao = 'Corredor A - Prateleira 01' WHERE codigo IN ('C-001', 'C-002', 'C-003');
UPDATE public.estoque_produtos SET localizacao = 'Corredor A - Prateleira 02' WHERE codigo IN ('C-004', 'C-005', 'C-006', 'C-007');
UPDATE public.estoque_produtos SET localizacao = 'Rack de Cabos - Setor B' WHERE codigo IN ('C-008', 'C-009', 'C-010', 'C-011', 'C-012');
UPDATE public.estoque_produtos SET localizacao = 'Gaveteiro C - Gaveta 04' WHERE codigo IN ('C-013', 'C-014');
UPDATE public.estoque_produtos SET localizacao = 'Armário D - Prateleira 01' WHERE codigo IN ('C-015', 'C-016');
UPDATE public.estoque_produtos SET localizacao = 'Armário D - Prateleira 02' WHERE codigo IN ('C-017', 'C-018', 'C-019');
UPDATE public.estoque_produtos SET localizacao = 'Galpão Externo - Setor E' WHERE codigo = 'C-020';
