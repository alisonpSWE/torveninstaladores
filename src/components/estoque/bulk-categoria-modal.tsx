'use client';

import React, { useState, useEffect } from 'react';
import { useBulkUpdateCategoria } from '@/lib/query/hooks';
import { EstoqueProduto } from '@/lib/supabase/types';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderEdit, Loader2, CheckCircle2, Plus } from 'lucide-react';

interface BulkCategoriaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: EstoqueProduto[];
  availableCategories?: string[];
  onSuccess: () => void;
}

const DEFAULT_CATEGORIES = [
  'Fixação',
  'Cabos',
  'Conectores',
  'Caixas',
  'Acessórios',
  'Inversores',
  'Módulos',
  'Outros',
];

export function BulkCategoriaModal({
  open,
  onOpenChange,
  selectedItems,
  availableCategories = [],
  onSuccess,
}: BulkCategoriaModalProps) {
  const [selectedCat, setSelectedCat] = useState('Fixação');
  const [customCat, setCustomCat] = useState('');
  const [error, setError] = useState<string | null>(null);

  const bulkMutation = useBulkUpdateCategoria();

  // Combina categorias padrão com categorias dinâmicas do banco
  const allCategories = React.useMemo(() => {
    const set = new Set([...availableCategories.filter((c) => c !== 'Todos'), ...DEFAULT_CATEGORIES]);
    return Array.from(set).filter(Boolean);
  }, [availableCategories]);

  useEffect(() => {
    if (open && allCategories.length > 0) {
      setSelectedCat(allCategories[0]);
      setCustomCat('');
      setError(null);
    }
  }, [open, allCategories]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalCategory = selectedCat === '__nova__' ? customCat.trim() : selectedCat.trim();

    if (!finalCategory) {
      setError('Por favor, informe a categoria desejada.');
      return;
    }

    const ids = selectedItems.map((i) => i.id);
    if (ids.length === 0) return;

    try {
      await bulkMutation.mutateAsync({
        ids,
        categoria: finalCategory,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar categoria em lote.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-white">
          <FolderEdit className="w-5 h-5 text-[#ffc61e]" />
          <span>Ajustar Categoria em Lote</span>
        </DialogTitle>
        <DialogDescription>
          Alterar a categoria de {selectedItems.length} produto(s) selecionado(s) simultaneamente.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSave} className="space-y-4 mt-3">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-300">Nova Categoria</label>
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="w-full h-11 rounded-xl bg-zinc-950 border border-zinc-800 px-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#ffc61e]"
          >
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
            <option value="__nova__">+ Cadastrar Nova Categoria...</option>
          </select>

          {selectedCat === '__nova__' && (
            <div className="pt-1">
              <Input
                type="text"
                autoFocus
                placeholder="Digite o nome da nova categoria (ex: Ferramentas)"
                value={customCat}
                onChange={(e) => setCustomCat(e.target.value)}
                className="bg-zinc-950 border-zinc-700 text-xs text-white rounded-xl min-h-[44px]"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={bulkMutation.isPending}
            className="min-h-[44px]"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={bulkMutation.isPending}
            className="bg-[#ffc61e] text-black hover:bg-[#e5b010] font-extrabold min-h-[44px] px-5 flex items-center gap-1.5"
          >
            {bulkMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Atualizando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Aplicar a {selectedItems.length} Itens</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
