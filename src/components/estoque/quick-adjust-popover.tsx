'use client';

import React, { useState, useRef, useEffect } from 'react';
import { EstoqueProduto } from '@/lib/supabase/types';
import { useQuickAdjustSaldo } from '@/lib/query/hooks';
import { Plus, Minus, Check, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface QuickAdjustPopoverProps {
  produto: EstoqueProduto;
  onToast?: (message: string, undoFn?: () => Promise<void>) => void;
  compact?: boolean;
}

const ENTRADA_REASONS = [
  { label: 'Compra / NF', icon: '🛒' },
  { label: 'Sobra de Obra', icon: '🔄' },
  { label: 'Devolução', icon: '📦' },
  { label: 'Ajuste Balanço', icon: '⚖️' },
];

const SAIDA_REASONS = [
  { label: 'Uso em Obra', icon: '⚡' },
  { label: 'Avaria / Quebra', icon: '⚠️' },
  { label: 'Defeito / RMA', icon: '❌' },
  { label: 'Ajuste Balanço', icon: '⚖️' },
];

export function QuickAdjustPopover({
  produto,
  onToast,
  compact = false,
}: QuickAdjustPopoverProps) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<'entrada' | 'saida'>('entrada');
  const [customReason, setCustomReason] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const quickAdjustMutation = useQuickAdjustSaldo();
  const step = produto.unidade === 'm' ? 5 : 1;
  const saldo = Number(produto.quantidade_saldo || 0);

  // Fechar ao clicar fora ou apertar Escape
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCustomInput(false);
        setCustomReason('');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setShowCustomInput(false);
        setCustomReason('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleOpen = (e: React.MouseEvent, dir: 'entrada' | 'saida') => {
    e.stopPropagation();
    setDirection(dir);
    setOpen(true);
    setShowCustomInput(false);
    setCustomReason('');
  };

  const executeAdjustment = async (motivo: string) => {
    const delta = direction === 'entrada' ? step : -step;
    
    // Evitar saldo negativo se for saída e já estiver zerado
    if (direction === 'saida' && saldo <= 0) {
      if (onToast) onToast(`O saldo de ${produto.nome} já está zerado.`);
      setOpen(false);
      return;
    }

    setOpen(false);
    setShowCustomInput(false);
    setCustomReason('');

    try {
      await quickAdjustMutation.mutateAsync({
        id: produto.id,
        delta,
        motivo,
      });

      const dirLabel = direction === 'entrada' ? `+${step}` : `-${step}`;
      const msg = `${dirLabel} ${produto.unidade} em "${produto.nome}" (${motivo})`;

      if (onToast) {
        onToast(msg, async () => {
          // Callback de Undo
          await quickAdjustMutation.mutateAsync({
            id: produto.id,
            delta: -delta,
            motivo: `Desfazer ajuste: ${motivo}`,
          });
        });
      }
    } catch (err: any) {
      if (onToast) {
        onToast(`Erro ao ajustar saldo: ${err.message || 'Falha de conexão'}`);
      }
    }
  };

  const reasons = direction === 'entrada' ? ENTRADA_REASONS : SAIDA_REASONS;
  const isEntrada = direction === 'entrada';

  return (
    <div className="relative inline-block" ref={containerRef} onClick={(e) => e.stopPropagation()}>
      {/* Botões Stepper +/- */}
      <div className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900/90 p-0.5 shadow-sm">
        {/* Botão Diminuir (-) */}
        <button
          type="button"
          onClick={(e) => handleOpen(e, 'saida')}
          disabled={quickAdjustMutation.isPending || saldo <= 0}
          title={`Dar saída (-${step} ${produto.unidade}) com motivo rápido`}
          aria-label={`Reduzir estoque de ${produto.nome}`}
          className={`relative rounded-lg p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors ${
            saldo <= 0
              ? 'opacity-30 cursor-not-allowed text-zinc-600'
              : 'text-zinc-300 hover:text-rose-400 hover:bg-zinc-800/80 active:scale-95'
          }`}
        >
          <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>

        <span className="text-xs font-mono font-bold text-zinc-400 px-1 select-none tabular-nums">
          ±{step}
        </span>

        {/* Botão Aumentar (+) */}
        <button
          type="button"
          onClick={(e) => handleOpen(e, 'entrada')}
          disabled={quickAdjustMutation.isPending}
          title={`Dar entrada (+${step} ${produto.unidade}) com motivo rápido`}
          aria-label={`Aumentar estoque de ${produto.nome}`}
          className="relative rounded-lg p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-zinc-300 hover:text-emerald-400 hover:bg-zinc-800/80 active:scale-95 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>

      {/* Popover Ultra-Rápido Flutuante */}
      {open && (
        <div
          className={`absolute z-50 bottom-full mb-2 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 w-64 p-3 bg-zinc-900/95 border border-zinc-700 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-left`}
        >
          {/* Header do Popover com Direção e SKU */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-black font-mono px-2 py-0.5 rounded-md border ${
                  isEntrada
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}
              >
                {isEntrada ? (
                  <ArrowUpRight className="w-3 h-3 stroke-[3]" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 stroke-[3]" />
                )}
                {isEntrada ? `+${step}` : `-${step}`} {produto.unidade}
              </span>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                {isEntrada ? 'Entrada Rápida' : 'Baixa de Estoque'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Fechar popover"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Nome e Saldo Previsto */}
          <div className="text-xs text-zinc-300 mb-2 truncate">
            <span className="font-bold text-white">{produto.nome}</span>
            <span className="text-zinc-400 text-xs block font-mono">
              Saldo: {saldo} ➔ {isEntrada ? saldo + step : Math.max(0, saldo - step)} {produto.unidade}
            </span>
          </div>

          {/* Motivo em 1 Toque */}
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
            Motivo do Ajuste (1 Toque):
          </p>

          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {reasons.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => executeAdjustment(r.label)}
                disabled={quickAdjustMutation.isPending}
                className="flex items-center gap-1.5 p-2 rounded-xl text-left text-xs font-semibold bg-zinc-800/90 hover:bg-zinc-700 active:bg-[#ffc61e] active:text-black text-zinc-200 hover:text-white border border-zinc-700/80 transition-all min-h-[40px] shadow-sm"
              >
                <span className="text-sm">{r.icon}</span>
                <span className="text-xs leading-tight font-medium">{r.label}</span>
              </button>
            ))}
          </div>

          {/* Input de Motivo Customizado (Opcional) */}
          {showCustomInput ? (
            <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-800">
              <input
                type="text"
                autoFocus
                placeholder="Ex: NF 489, Troca..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customReason.trim()) {
                    executeAdjustment(customReason.trim());
                  }
                }}
                className="flex-1 px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 text-xs text-white placeholder:text-zinc-500 rounded-lg focus:outline-none focus:border-[#ffc61e]"
              />
              <button
                type="button"
                onClick={() => {
                  if (customReason.trim()) {
                    executeAdjustment(customReason.trim());
                  }
                }}
                disabled={!customReason.trim() || quickAdjustMutation.isPending}
                className="p-2 bg-[#ffc61e] text-black font-bold rounded-lg text-xs hover:bg-[#e5b010] disabled:opacity-40"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="text-zinc-400 hover:text-[#ffc61e] underline underline-offset-2 transition-colors py-1"
              >
                Outro motivo...
              </button>
              <button
                type="button"
                onClick={() => executeAdjustment('Ajuste Rápido')}
                className="text-zinc-400 hover:text-white font-bold transition-colors py-1"
              >
                Sem motivo ➔
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
