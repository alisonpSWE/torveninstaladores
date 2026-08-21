'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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

  const step = produto.unidade === 'm' ? 5 : 1;
  const [amount, setAmount] = useState<number>(step);

  const [coords, setCoords] = useState<{ top: number; left: number; openUpwards: boolean }>({
    top: 0,
    left: 0,
    openUpwards: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const quickAdjustMutation = useQuickAdjustSaldo();
  const saldo = Number(produto.quantidade_saldo || 0);

  // Quick preset pills baseados na unidade do produto
  const presets =
    produto.unidade === 'm'
      ? [5, 10, 25, 50, 100]
      : [1, 2, 5, 10, 20];

  // Calcula a posição fixa exata do popover na tela para NUNCA ser cortado por tabelas ou headers
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 280;
    const estimatedHeight = 340;

    // Verifica o espaço disponível acima e abaixo do botão
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpwards = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    const top = openUpwards
      ? Math.max(12, rect.top - estimatedHeight - 8)
      : Math.min(window.innerHeight - estimatedHeight - 12, rect.bottom + 8);

    // Alinhamento horizontal ancorado à direita do botão, respeitando os limites da tela
    const idealLeft = rect.right - popoverWidth;
    const left = Math.max(12, Math.min(window.innerWidth - popoverWidth - 12, idealLeft));

    setCoords({
      top,
      left,
      openUpwards,
    });
  };

  useLayoutEffect(() => {
    if (open) {
      updatePosition();
    }
  }, [open, showCustomInput, amount]);

  // Fechar ao clicar fora, ao rolar a página ou apertar Escape
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setOpen(false);
        setShowCustomInput(false);
        setCustomReason('');
        setAmount(step);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setShowCustomInput(false);
        setCustomReason('');
        setAmount(step);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open, step]);

  // Ao clicar no botão + ou - na tabela
  const handleTriggerClick = (e: React.MouseEvent, dir: 'entrada' | 'saida') => {
    e.stopPropagation();

    // Se já estiver aberto na mesma direção, acumula o valor (+1, +2, +3...)
    if (open && direction === dir) {
      setAmount((prev) => prev + step);
      return;
    }

    // Se estiver fechado ou mudar de direção, abre/reseta para o valor base
    setDirection(dir);
    setAmount(step);
    updatePosition();
    setOpen(true);
    setShowCustomInput(false);
    setCustomReason('');
  };

  const executeAdjustment = async (motivo: string) => {
    const finalAmount = Math.max(step, amount);
    const delta = direction === 'entrada' ? finalAmount : -finalAmount;

    // Evitar saldo negativo se for saída e já estiver zerado
    if (direction === 'saida' && saldo <= 0) {
      if (onToast) onToast(`O saldo de ${produto.nome} já está zerado.`);
      setOpen(false);
      setAmount(step);
      return;
    }

    setOpen(false);
    setShowCustomInput(false);
    setCustomReason('');
    setAmount(step);

    try {
      await quickAdjustMutation.mutateAsync({
        id: produto.id,
        delta,
        motivo,
      });

      const dirLabel = direction === 'entrada' ? `+${finalAmount}` : `-${finalAmount}`;
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
  const forecastedBalance = isEntrada ? saldo + amount : Math.max(0, saldo - amount);

  return (
    <div className="relative inline-block" ref={containerRef} onClick={(e) => e.stopPropagation()}>
      {/* Botões Stepper +/- */}
      <div className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900/90 p-0.5 shadow-sm">
        {/* Botão Diminuir (-) */}
        <button
          type="button"
          onClick={(e) => handleTriggerClick(e, 'saida')}
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

        <span
          className={`text-xs font-mono font-bold px-1 select-none tabular-nums ${
            open
              ? isEntrada
                ? 'text-emerald-400 font-black'
                : 'text-rose-400 font-black'
              : 'text-zinc-400'
          }`}
        >
          {open ? (isEntrada ? `+${amount}` : `-${amount}`) : `±${step}`}
        </span>

        {/* Botão Aumentar (+) */}
        <button
          type="button"
          onClick={(e) => handleTriggerClick(e, 'entrada')}
          disabled={quickAdjustMutation.isPending}
          title={`Dar entrada (+${step} ${produto.unidade}) com motivo rápido`}
          aria-label={`Aumentar estoque de ${produto.nome}`}
          className="relative rounded-lg p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-zinc-300 hover:text-emerald-400 hover:bg-zinc-800/80 active:scale-95 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>

      {/* Popover Ultra-Rápido renderizado em Portal (para nunca sofrer overflow clipping) */}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            className="fixed z-[9999] w-[280px] p-3.5 bg-zinc-900/98 border border-zinc-700 rounded-2xl shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 text-left text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Popover com Direção e SKU */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
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
                  {isEntrada ? `+${amount}` : `-${amount}`} {produto.unidade}
                </span>
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">
                  {isEntrada ? 'Entrada de Estoque' : 'Baixa de Estoque'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setAmount(step);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                aria-label="Fechar popover"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Seletor de Quantidade com Stepper e Atalhos */}
            <div className="py-2.5 space-y-2">
              <div className="flex items-center justify-between bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAmount((prev) => Math.max(step, prev - step))}
                  disabled={amount <= step}
                  className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed font-bold transition-colors"
                  title={`Diminuir ${step} ${produto.unidade}`}
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                <div className="flex flex-col items-center">
                  <span
                    className={`font-mono font-black text-base tabular-nums ${
                      isEntrada ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isEntrada ? `+${amount}` : `-${amount}`} {produto.unidade}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium">
                    Clique no + para somar mais
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setAmount((prev) => prev + step)}
                  className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center font-bold transition-colors"
                  title={`Adicionar +${step} ${produto.unidade}`}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              {/* Chips de Atalhos Rápidos (+1, +2, +5, +10...) */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {presets.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all shrink-0 ${
                      amount === val
                        ? isEntrada
                          ? 'bg-emerald-500 text-black font-black shadow-sm'
                          : 'bg-rose-500 text-white font-black shadow-sm'
                        : 'bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                    }`}
                  >
                    {isEntrada ? `+${val}` : `-${val}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Nome e Saldo Previsto */}
            <div className="text-xs text-zinc-300 mb-2 truncate bg-zinc-950/60 p-2 rounded-xl border border-zinc-850">
              <span className="font-bold text-white block truncate">{produto.nome}</span>
              <span className="text-zinc-400 text-xs block font-mono mt-0.5">
                Saldo: {saldo} ➔{' '}
                <strong className={isEntrada ? 'text-emerald-400' : 'text-amber-300'}>
                  {forecastedBalance} {produto.unidade}
                </strong>
              </span>
            </div>

            {/* Motivo em 1 Toque */}
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Confirmar com Motivo (1 Toque):
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
                  <span className="text-sm shrink-0">{r.icon}</span>
                  <span className="text-xs leading-tight font-medium truncate">{r.label}</span>
                </button>
              ))}
            </div>

            {/* Input de Motivo Customizado (Opcional) */}
            {showCustomInput ? (
              <div className="flex items-center gap-1.5 pt-1.5 border-t border-zinc-800">
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
              <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800 text-xs">
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
          </div>,
          document.body
        )}
    </div>
  );
}
