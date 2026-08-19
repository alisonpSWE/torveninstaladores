'use client';

import React, { useState } from 'react';
import { EstoqueProduto } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import {
  CheckSquare,
  X,
  Download,
  ShoppingCart,
  FolderEdit,
  Copy,
  Check,
} from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface BulkActionsBarProps {
  selectedItems: EstoqueProduto[];
  onClearSelection: () => void;
  onOpenBulkCategory: () => void;
}

export function BulkActionsBar({
  selectedItems,
  onClearSelection,
  onOpenBulkCategory,
}: BulkActionsBarProps) {
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (selectedItems.length === 0) return null;

  // 1. Exportar Selecionados para CSV
  const handleExportSelected = () => {
    const headers = ['Código', 'Nome', 'Categoria', 'Unidade', 'Saldo Atual', 'Estoque Mínimo', 'Endereçamento'];
    const rows = selectedItems.map((item) => [
      item.codigo,
      `"${item.nome.replace(/"/g, '""')}"`,
      item.categoria,
      item.unidade,
      item.quantidade_saldo,
      item.estoque_minimo,
      `"${(item.localizacao || 'Almoxarifado Geral').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `estoque_selecionados_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Solicitar Compra: Gerar lista formatada
  const purchaseListText = selectedItems
    .map((item) => {
      const needed = Math.max(0, Number(item.estoque_minimo) - Number(item.quantidade_saldo));
      return `• [${item.codigo}] ${item.nome} | Saldo: ${item.quantidade_saldo} ${item.unidade} | Mín: ${item.estoque_minimo} ${item.unidade}${needed > 0 ? ` ➔ Sugestão Compra: ${needed} ${item.unidade}` : ''}`;
    })
    .join('\n');

  const handleCopyPurchaseList = () => {
    navigator.clipboard.writeText(
      `SOLICITAÇÃO DE COMPRA DE MATERIAIS - TORVEN\nData: ${new Date().toLocaleDateString('pt-BR')}\n\n${purchaseListText}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl bg-zinc-900/95 border border-zinc-700 shadow-2xl backdrop-blur-lg rounded-2xl p-3 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Contador de Seleção */}
        <div className="flex items-center gap-2 pl-1">
          <div className="w-8 h-8 rounded-xl bg-[#ffc61e] text-black flex items-center justify-center font-black text-xs shrink-0">
            {selectedItems.length}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-white leading-tight">
              {selectedItems.length === 1 ? '1 item selecionado' : `${selectedItems.length} itens selecionados`}
            </p>
            <p className="text-xs text-zinc-400">Ações em lote disponíveis</p>
          </div>
        </div>

        {/* Botões de Ações em Lote */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* Ajustar Categoria */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenBulkCategory}
            className="h-9 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-semibold rounded-xl flex items-center gap-1.5 min-h-[36px]"
          >
            <FolderEdit className="w-3.5 h-3.5 text-[#ffc61e]" />
            <span className="hidden md:inline">Ajustar Categoria</span>
            <span className="md:hidden">Categoria</span>
          </Button>

          {/* Exportar CSV */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleExportSelected}
            className="h-9 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-semibold rounded-xl flex items-center gap-1.5 min-h-[36px]"
          >
            <Download className="w-3.5 h-3.5 text-[#ffc61e]" />
            <span className="hidden md:inline">Exportar CSV</span>
            <span className="md:hidden">Exportar</span>
          </Button>

          {/* Solicitar Compra */}
          <Button
            type="button"
            size="sm"
            onClick={() => setPurchaseDialogOpen(true)}
            className="h-9 text-xs bg-[#ffc61e] hover:bg-[#e5b010] text-black font-extrabold rounded-xl flex items-center gap-1.5 min-h-[36px] shadow-sm"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Solicitar Compra</span>
          </Button>

          {/* Desmarcar Todos */}
          <button
            type="button"
            onClick={onClearSelection}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors ml-1"
            title="Desmarcar todos"
            aria-label="Desmarcar todos os itens selecionados"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal de Solicitação de Compra */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ShoppingCart className="w-5 h-5 text-[#ffc61e]" />
            <span>Solicitação de Compra ({selectedItems.length} itens)</span>
          </DialogTitle>
          <DialogDescription>
            Lista consolidada de materiais selecionados para cotação e aquisição.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 max-h-60 overflow-y-auto">
            <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {purchaseListText}
            </pre>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPurchaseDialogOpen(false)}
              className="text-xs min-h-[40px]"
            >
              Fechar
            </Button>

            <Button
              type="button"
              onClick={handleCopyPurchaseList}
              className="bg-[#ffc61e] text-black hover:bg-[#e5b010] font-extrabold text-xs flex items-center gap-1.5 min-h-[40px] px-4"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copiado para a Área de Transferência!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Lista para WhatsApp / E-mail</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
