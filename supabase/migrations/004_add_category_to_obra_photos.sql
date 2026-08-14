-- ==============================================================================
-- MIGRAÇÃO DE BANCO: Adiciona Coluna de Categoria em obra_photos
-- ==============================================================================

-- Adiciona a coluna 'category' com valor padrão 'registro'
ALTER TABLE public.obra_photos 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'registro';

-- Índice para busca rápida filtrada por id_obra e categoria
CREATE INDEX IF NOT EXISTS idx_obra_photos_id_obra_category 
ON public.obra_photos(id_obra, category);
