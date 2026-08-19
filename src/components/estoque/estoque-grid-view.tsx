'use client';

import React from 'react';
import { EstoqueProduto } from '@/lib/supabase/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QuickAdjustPopover } from './quick-adjust-popover';
import {
  MapPin,
  History,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
} from 'lucide-react';

interface EstoqueGridViewProps {
  produtos: EstoqueProduto[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onOpenKardex: (produto: EstoqueProduto) => void;
  onOpenAdjust: (produto: EstoqueProduto) => void;
  onToast?: (message: string, undoFn?: () => Promise<void>) => void;
}

interface EstoqueCardItemProps {
  produto: EstoqueProduto;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onOpenKardex: (produto: EstoqueProduto) => void;
  onOpenAdjust: (produto: EstoqueProduto) => void;
  onToast?: (message: string, undoFn?: () => Promise<void>) => void;
}

const EstoqueCardItem = React.memo(function EstoqueCardItem({
  produto,
  isSelected,
  onToggleSelect,
  onOpenKardex,
  onOpenAdjust,
  onToast,
}: EstoqueCardItemProps) {
  const saldo = Number(produto.quantidade_saldo || 0);
  const minimo = Number(produto.estoque_minimo || 0);

  const status =
    saldo <= 0
      ? {
          label: 'Crítico',
          className: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          icon: AlertOctagon,
        }
      : saldo <= minimo
      ? {
          label: 'Baixo',
          className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          icon: AlertTriangle,
        }
      : {
          label: 'Normal',
          className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: CheckCircle2,
        };

  const StatusIcon = status.icon;

  return (
    <Card
      onClick={() => onToggleSelect(produto.id)}
      className={`p-4 rounded-2xl transition-all border cursor-pointer [content-visibility:auto] [contain-intrinsic-size:auto_180px] ${
        isSelected
          ? 'bg-zinc-950 border-[#ffc61e] ring-1 ring-[#ffc61e]/40 shadow-lg'
          : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="flex flex-col justify-between h-full space-y-3">
        {/* Topo do Card */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(produto.id)}
                onClick={(e) => e.stopPropagation()}
                className="rounded border-zinc-700 bg-zinc-900 accent-[#ffc61e] w-4 h-4 cursor-pointer focus:ring-2 focus:ring-[#ffc61e]"
              />
              <span className="font-mono text-xs font-black text-[#ffc61e] bg-[#ffc61e]/15 px-2 py-0.5 rounded-md border border-[#ffc61e]/30">
                {produto.codigo}
              </span>
              <span className="text-xs font-semibold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                {produto.categoria}
              </span>
            </div>

            <span
              className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md border ${status.className}`}
            >
              <StatusIcon className="w-3 h-3 shrink-0" />
              <span>{status.label}</span>
            </span>
          </div>

          <h3 className="text-sm font-bold text-white leading-snug">
            {produto.nome}
          </h3>

          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="truncate">{produto.localizacao || 'Almoxarifado Geral'}</span>
          </div>
        </div>

        {/* Métricas de Saldo */}
        <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Saldo Atual:</span>
            <span className="font-mono tabular-nums font-black text-base text-white">
              {produto.quantidade_saldo} <span className="text-xs font-normal text-zinc-400">{produto.unidade}</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-xs border-t border-zinc-800/60 pt-1.5">
            <span className="text-zinc-400 font-medium">Estoque Mínimo:</span>
            <span className="font-mono tabular-nums text-xs text-zinc-300 font-bold">
              {produto.estoque_minimo} {produto.unidade}
            </span>
          </div>
        </div>

        {/* Botões de Ação com Stepper Rápido */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-850" onClick={(e) => e.stopPropagation()}>
          <QuickAdjustPopover produto={produto} onToast={onToast} />

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenKardex(produto)}
              className="h-9 text-xs border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl flex items-center justify-center gap-1 px-2.5 min-h-[36px]"
              title="Ver histórico de movimentação (Kardex)"
            >
              <History className="w-3.5 h-3.5 text-[#ffc61e]" />
              <span>Kardex</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenAdjust(produto)}
              className="h-9 text-xs border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl flex items-center justify-center gap-1 px-2.5 min-h-[36px]"
              title="Ajustar saldo e parâmetros cadastrais"
            >
              <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Ajustar</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
});

export function EstoqueGridView({
  produtos,
  selectedIds,
  onToggleSelect,
  onOpenKardex,
  onOpenAdjust,
  onToast,
}: EstoqueGridViewProps) {
  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {produtos.map((produto) => (
        <EstoqueCardItem
          key={produto.id}
          produto={produto}
          isSelected={selectedSet.has(produto.id)}
          onToggleSelect={onToggleSelect}
          onOpenKardex={onOpenKardex}
          onOpenAdjust={onOpenAdjust}
          onToast={onToast}
        />
      ))}
    </div>
  );
}
