-- ==============================================================================
-- MIGRAÇÃO DE BANCO: Adiciona Coluna de Subcategoria em obra_photos
-- ==============================================================================

-- Adiciona a coluna 'subcategory' com valor padrão 'geral'
ALTER TABLE public.obra_photos 
ADD COLUMN IF NOT EXISTS subcategory TEXT DEFAULT 'geral';

-- Índice composto para busca ultra-rápida filtrada por obra, categoria e subcategoria
CREATE INDEX IF NOT EXISTS idx_obra_photos_id_obra_cat_subcat 
ON public.obra_photos(id_obra, category, subcategory);
