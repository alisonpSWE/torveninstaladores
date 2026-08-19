'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { EstoqueProduto } from '@/lib/supabase/types';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Package,
  AlertOctagon,
  TrendingDown,
  CheckSquare,
  Square,
} from 'lucide-react';

interface CriticalPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtos: EstoqueProduto[];
}

export function CriticalPurchaseModal({
  open,
  onOpenChange,
  produtos,
}: CriticalPurchaseModalProps) {
  // Itens críticos (saldo <= mínimo)
  const criticalItems = useMemo(() => {
    return produtos.filter(
      (p) => Number(p.quantidade_saldo || 0) <= Number(p.estoque_minimo || 0)
    );
  }, [produtos]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);

  // Inicializa seleção e quantidades calculadas sempre que o modal abre ou a lista muda
  useEffect(() => {
    if (open && criticalItems.length > 0) {
      const allIds = criticalItems.map((p) => p.id);
      setSelectedIds(allIds);

      const initialQtys: Record<string, number> = {};
      criticalItems.forEach((p) => {
        const saldo = Number(p.quantidade_saldo || 0);
        const min = Number(p.estoque_minimo || 0);
        const deficit = Math.max(1, min - saldo);
        initialQtys[p.id] = deficit;
      });
      setQuantities(initialQtys);
    }
  }, [open, criticalItems]);

  const handleToggleItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    if (selectedIds.length === criticalItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(criticalItems.map((p) => p.id));
    }
  };

  const handleQuantityChange = (id: string, val: string) => {
    const num = parseFloat(val);
    setQuantities((prev) => ({
      ...prev,
      [id]: isNaN(num) ? 0 : Math.max(0, num),
    }));
  };

  // Itens ativos no pedido
  const activeItems = useMemo(() => {
    const set = new Set(selectedIds);
    return criticalItems
      .filter((p) => set.has(p.id))
      .map((p) => ({
        ...p,
        orderQuantity: quantities[p.id] ?? Math.max(1, Number(p.estoque_minimo) - Number(p.quantidade_saldo)),
      }));
  }, [criticalItems, selectedIds, quantities]);

  const totalOrderUnits = useMemo(() => {
    return activeItems.reduce((acc, item) => acc + (Number(item.orderQuantity) || 0), 0);
  }, [activeItems]);

  // Texto formatado para WhatsApp / E-mail
  const purchaseListText = useMemo(() => {
    const header = `SOLICITAÇÃO DE COMPRA DE MATERIAIS CRÍTICOS - TORVEN\nData: ${new Date().toLocaleDateString('pt-BR')}\nTotal de Itens: ${activeItems.length} SKUs (${totalOrderUnits.toLocaleString('pt-BR')} unidades)\n`;
    const lines = activeItems.map((item) => {
      return `• [${item.codigo}] ${item.nome}\n  Saldo Atual: ${item.quantidade_saldo} ${item.unidade} | Estoque Mín: ${item.estoque_minimo} ${item.unidade}\n  ➔ QUANTIDADE A COMPRAR: ${item.orderQuantity} ${item.unidade}\n`;
    });
    return `${header}\n${lines.join('\n')}`;
  }, [activeItems, totalOrderUnits]);

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(purchaseListText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Exportar para CSV de Cotação
  const handleExportCSV = () => {
    const headers = [
      'Código SKU',
      'Descrição do Material',
      'Categoria',
      'Unidade',
      'Saldo Atual',
      'Estoque Mínimo',
      'Déficit Apurado',
      'Quantidade a Comprar (Pedido)',
    ];

    const rows = activeItems.map((item) => {
      const deficit = Math.max(0, Number(item.estoque_minimo) - Number(item.quantidade_saldo));
      return [
        item.codigo,
        `"${item.nome.replace(/"/g, '""')}"`,
        item.categoria,
        item.unidade,
        item.quantidade_saldo,
        item.estoque_minimo,
        deficit,
        item.orderQuantity,
      ];
    });

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pedido_compra_criticos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4 max-h-[85vh] flex flex-col">
        {/* Cabeçalho */}
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <span>Pedido de Compra — Reposição Crítica</span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            Itens com saldo zerado ou abaixo do estoque mínimo. Ajuste as quantidades sugeridas antes de exportar.
          </DialogDescription>
        </DialogHeader>

        {criticalItems.length === 0 ? (
          <div className="text-center py-12 bg-zinc-950/60 rounded-2xl border border-dashed border-zinc-800 p-6 space-y-2">
            <Package className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">Nenhum item com estoque crítico!</h3>
            <p className="text-xs text-zinc-400">
              Todos os materiais cadastrados estão com saldo superior ao estoque mínimo de segurança.
            </p>
          </div>
        ) : (
          <>
            {/* Barra de Ações Rápidas da Lista */}
            <div className="flex items-center justify-between gap-2 py-1.5 px-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={handleToggleAll}
                className="flex items-center gap-1.5 text-zinc-300 hover:text-white font-semibold transition-colors"
              >
                {selectedIds.length === criticalItems.length ? (
                  <CheckSquare className="w-4 h-4 text-[#ffc61e]" />
                ) : (
                  <Square className="w-4 h-4 text-zinc-500" />
                )}
                <span>
                  {selectedIds.length === criticalItems.length
                    ? 'Desmarcar Todos'
                    : 'Marcar Todos'} ({selectedIds.length}/{criticalItems.length})
                </span>
              </button>

              <div className="text-zinc-400 text-xs font-mono">
                Total Sugerido:{' '}
                <span className="text-[#ffc61e] font-bold text-xs">
                  {totalOrderUnits.toLocaleString('pt-BR')} un
                </span>
              </div>
            </div>

            {/* Lista Scrollável de Itens Críticos */}
            <div className="overflow-y-auto max-h-[42vh] pr-1 space-y-2 border border-zinc-800 rounded-xl p-2 bg-zinc-950/60">
              {criticalItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const saldo = Number(item.quantidade_saldo || 0);
                const min = Number(item.estoque_minimo || 0);
                const isZero = saldo <= 0;
                const qty = quantities[item.id] ?? Math.max(1, min - saldo);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleItem(item.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-zinc-900/90 border-amber-500/40 shadow-sm'
                        : 'bg-zinc-950 border-zinc-800/80 opacity-60'
                    }`}
                  >
                    {/* Identificação do Item */}
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleItem(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 rounded border-zinc-700 bg-zinc-900 accent-[#ffc61e] w-4 h-4 shrink-0 cursor-pointer"
                      />
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-black text-[#ffc61e]">
                            {item.codigo}
                          </span>
                          <span className="text-xs font-semibold text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                            {item.categoria}
                          </span>
                          {isZero ? (
                            <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 flex items-center gap-0.5">
                              <AlertOctagon className="w-3 h-3" /> Zerado
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-0.5">
                              <TrendingDown className="w-3 h-3" /> Baixo
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white leading-tight truncate">
                          {item.nome}
                        </h4>
                        <div className="text-xs text-zinc-400 font-mono flex items-center gap-2">
                          <span>
                            Saldo: <strong className={isZero ? 'text-rose-400' : 'text-amber-300'}>{saldo}</strong> {item.unidade}
                          </span>
                          <span>•</span>
                          <span>
                            Mínimo: <strong className="text-zinc-300">{min}</strong> {item.unidade}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quantidade a Comprar (Editável) */}
                    <div
                      className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-850"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label className="text-xs text-zinc-400 uppercase font-semibold sm:hidden">
                        Qtd a Comprar:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          step={item.unidade === 'm' ? '5' : '1'}
                          value={qty}
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                          disabled={!isSelected}
                          className="w-24 px-2.5 py-1 bg-zinc-950 border border-zinc-700 text-white font-mono font-bold text-sm text-right rounded-lg focus:outline-none focus:border-[#ffc61e] disabled:opacity-40"
                        />
                        <span className="text-xs text-zinc-400 font-medium w-7">
                          {item.unidade}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ações Finais: Copiar para WhatsApp & Exportar CSV */}
            <div className="pt-2 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto text-xs min-h-[40px] border-zinc-800"
              >
                Fechar
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportCSV}
                  disabled={activeItems.length === 0}
                  className="flex-1 sm:flex-initial text-xs border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold min-h-[40px] flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-[#ffc61e]" />
                  <span>Exportar CSV</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  disabled={activeItems.length === 0}
                  className="flex-1 sm:flex-initial bg-[#ffc61e] hover:bg-[#e5b010] text-black font-extrabold text-xs min-h-[40px] px-4 flex items-center gap-1.5 shadow-md"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Pedido (WhatsApp)</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
