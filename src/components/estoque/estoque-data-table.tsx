'use client';

import React from 'react';
import { EstoqueProduto } from '@/lib/supabase/types';
import { QuickAdjustPopover } from './quick-adjust-popover';
import {
  MapPin,
  History,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
} from 'lucide-react';

interface EstoqueDataTableProps {
  produtos: EstoqueProduto[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onOpenKardex: (produto: EstoqueProduto) => void;
  onOpenAdjust: (produto: EstoqueProduto) => void;
  onToast?: (message: string, undoFn?: () => Promise<void>) => void;
}

interface EstoqueTableRowProps {
  produto: EstoqueProduto;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onOpenKardex: (produto: EstoqueProduto) => void;
  onOpenAdjust: (produto: EstoqueProduto) => void;
  onToast?: (message: string, undoFn?: () => Promise<void>) => void;
}

const EstoqueTableRow = React.memo(function EstoqueTableRow({
  produto,
  isSelected,
  onToggleSelect,
  onOpenKardex,
  onOpenAdjust,
  onToast,
}: EstoqueTableRowProps) {
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
    <tr
      onClick={() => onToggleSelect(produto.id)}
      className={`group transition-colors cursor-pointer [content-visibility:auto] [contain-intrinsic-size:auto_52px] ${
        isSelected
          ? 'bg-[#ffc61e]/10 hover:bg-[#ffc61e]/15'
          : 'hover:bg-zinc-900/60'
      }`}
    >
      {/* Checkbox de Seleção */}
      <td className="p-3 pl-4" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(produto.id)}
          aria-label={`Selecionar ${produto.nome}`}
          className="rounded border-zinc-700 bg-zinc-900 accent-[#ffc61e] w-4 h-4 cursor-pointer focus:ring-2 focus:ring-[#ffc61e]"
        />
      </td>

      {/* Código / SKU */}
      <td className="py-3 px-2 font-mono font-black text-[#ffc61e] text-xs whitespace-nowrap">
        {produto.codigo}
      </td>

      {/* Descrição + Tag de Categoria */}
      <td className="py-3 px-3 max-w-[260px] sm:max-w-md">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-white leading-tight">
            {produto.nome}
          </span>
          <span className="text-xs font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
            {produto.categoria}
          </span>
        </div>
        {/* Endereçamento no mobile */}
        <div className="lg:hidden text-xs text-zinc-400 flex items-center gap-1 pt-0.5">
          <MapPin className="w-3 h-3 text-zinc-500" />
          <span>{produto.localizacao || 'Almoxarifado Geral'}</span>
        </div>
      </td>

      {/* Endereçamento Físico (Desktop) */}
      <td className="py-3 px-3 hidden lg:table-cell text-zinc-400">
        <div className="flex items-center gap-1.5 text-xs">
          <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className="truncate max-w-[180px] font-medium text-zinc-300">
            {produto.localizacao || 'Almoxarifado Geral'}
          </span>
        </div>
      </td>

      {/* Saldo Atual */}
      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
        <span className="font-bold text-sm text-white">
          {produto.quantidade_saldo}
        </span>
        <span className="text-zinc-400 text-xs ml-1 font-sans">
          {produto.unidade}
        </span>
      </td>

      {/* Estoque Mínimo */}
      <td className="py-3 px-3 text-right font-mono tabular-nums text-zinc-400 text-xs hidden sm:table-cell whitespace-nowrap">
        <span>{produto.estoque_minimo} {produto.unidade}</span>
      </td>

      {/* Status Badge */}
      <td className="py-3 px-3 text-center whitespace-nowrap">
        <span
          className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md border ${status.className}`}
        >
          <StatusIcon className="w-3 h-3 shrink-0" />
          <span>{status.label}</span>
        </span>
      </td>

      {/* Ações Rápidas */}
      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          {/* Stepper +/- com Popover Ultra-Rápido */}
          <QuickAdjustPopover produto={produto} onToast={onToast} />

          {/* Kardex Modal */}
          <button
            type="button"
            onClick={() => onOpenKardex(produto)}
            title="Ver histórico de movimentação (Kardex)"
            className="p-2 min-h-[38px] min-w-[38px] rounded-xl text-zinc-400 hover:text-[#ffc61e] hover:bg-zinc-800/80 transition-colors border border-transparent hover:border-zinc-700 flex items-center justify-center focus:ring-2 focus:ring-[#ffc61e]"
            aria-label={`Ver Kardex de ${produto.nome}`}
          >
            <History className="w-4 h-4" />
          </button>

          {/* Editar / Ajuste Detalhado */}
          <button
            type="button"
            onClick={() => onOpenAdjust(produto)}
            title="Ajustar saldo e parâmetros cadastrais"
            className="p-2 min-h-[38px] min-w-[38px] rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors border border-transparent hover:border-zinc-700 flex items-center justify-center focus:ring-2 focus:ring-[#ffc61e]"
            aria-label={`Editar ${produto.nome}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

export function EstoqueDataTable({
  produtos,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onOpenKardex,
  onOpenAdjust,
  onToast,
}: EstoqueDataTableProps) {
  const isAllSelected = produtos.length > 0 && selectedIds.length === produtos.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < produtos.length;
  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <div className="border border-zinc-800/90 rounded-2xl overflow-hidden bg-zinc-950/80 shadow-md">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs" role="table" aria-label="Tabela de Inventário e Estoque">
          {/* Cabeçalho da Tabela */}
          <thead className="bg-zinc-900/90 text-zinc-400 font-semibold border-b border-zinc-800 text-xs uppercase tracking-wider">
            <tr>
              <th scope="col" className="p-3 pl-4 w-10">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isIndeterminate;
                  }}
                  onChange={onSelectAll}
                  aria-label="Selecionar todos os itens da página"
                  className="rounded border-zinc-700 bg-zinc-900 accent-[#ffc61e] w-4 h-4 cursor-pointer focus:ring-2 focus:ring-[#ffc61e]"
                />
              </th>
              <th scope="col" className="py-3 px-2 w-24">Código / SKU</th>
              <th scope="col" className="py-3 px-3">Descrição do Material</th>
              <th scope="col" className="py-3 px-3 hidden lg:table-cell">Endereçamento Físico</th>
              <th scope="col" className="py-3 px-3 text-right">Saldo Atual</th>
              <th scope="col" className="py-3 px-3 text-right hidden sm:table-cell">Estoque Mín.</th>
              <th scope="col" className="py-3 px-3 text-center">Status</th>
              <th scope="col" className="py-3 px-4 text-right w-52">Ações Rápidas</th>
            </tr>
          </thead>

          {/* Corpo da Tabela */}
          <tbody className="divide-y divide-zinc-850 text-zinc-300">
            {produtos.map((produto) => (
              <EstoqueTableRow
                key={produto.id}
                produto={produto}
                isSelected={selectedSet.has(produto.id)}
                onToggleSelect={onToggleSelect}
                onOpenKardex={onOpenKardex}
                onOpenAdjust={onOpenAdjust}
                onToast={onToast}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
