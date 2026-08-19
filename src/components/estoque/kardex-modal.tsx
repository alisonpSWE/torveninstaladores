'use client';

import React from 'react';
import { useEstoqueKardex } from '@/lib/query/hooks';
import { EstoqueProduto } from '@/lib/supabase/types';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  History,
  MapPin,
  Package,
  Calendar,
  User,
  ArrowDownRight,
  Loader2,
  FileText,
} from 'lucide-react';

interface KardexModalProps {
  produto: EstoqueProduto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KardexModal({ produto, open, onOpenChange }: KardexModalProps) {
  const { data: movimentacoes = [], isLoading } = useEstoqueKardex(produto?.id);

  if (!produto) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-white">
          <History className="w-5 h-5 text-[#ffc61e]" />
          <span>Ficha de Movimentação de Estoque (Kardex)</span>
        </DialogTitle>
        <DialogDescription className="text-xs text-zinc-400">
          Livro-razão e histórico de consumo deste material em obras de campo e manutenções.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 mt-2">
        {/* Resumo do Produto */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-[#ffc61e] bg-[#ffc61e]/15 px-2 py-0.5 rounded border border-[#ffc61e]/30">
                {produto.codigo}
              </span>
              <h3 className="text-sm font-bold text-white">{produto.nome}</h3>
            </div>
            <span className="text-xs font-semibold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              {produto.categoria}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-zinc-850 text-xs">
            <div>
              <span className="text-zinc-400 block text-xs uppercase font-semibold">Saldo Atual</span>
              <span className="font-mono tabular-nums font-bold text-white text-sm">
                {produto.quantidade_saldo} {produto.unidade}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block text-xs uppercase font-semibold">Estoque Mínimo</span>
              <span className="font-mono tabular-nums font-bold text-zinc-300 text-sm">
                {produto.estoque_minimo} {produto.unidade}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-zinc-400 block text-xs uppercase font-semibold">Endereçamento Físico</span>
              <span className="text-zinc-300 font-medium text-xs truncate block">
                {produto.localizacao || 'Almoxarifado Geral'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabela de Histórico de Consumo */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
            <span>Histórico de Saídas ({movimentacoes.length})</span>
          </h4>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[#ffc61e]" />
            </div>
          ) : movimentacoes.length === 0 ? (
            <div className="text-center py-10 bg-zinc-950/60 rounded-xl border border-dashed border-zinc-800 p-6 space-y-1.5">
              <Package className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs font-bold text-zinc-400">Nenhum consumo registrado ainda</p>
              <p className="text-xs text-zinc-400">
                Quando os instaladores lançarem este item nas obras, as movimentações aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/80">
              <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800/60 text-xs">
                <div className="sticky top-0 bg-zinc-900 grid grid-cols-12 gap-2 p-2.5 font-bold text-zinc-300 text-xs border-b border-zinc-800">
                  <span className="col-span-3">Data / Hora</span>
                  <span className="col-span-4">Destino / Obra</span>
                  <span className="col-span-2 text-right">Qtd Saída</span>
                  <span className="col-span-3 text-right">Responsável</span>
                </div>

                {movimentacoes.map((mov) => (
                  <div
                    key={mov.id}
                    className="grid grid-cols-12 gap-2 p-2.5 text-zinc-300 items-center hover:bg-zinc-900/40 transition-colors"
                  >
                    {/* Data */}
                    <span className="col-span-3 text-zinc-400 text-xs flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-zinc-500 shrink-0" />
                      {mov.created_at
                        ? new Date(mov.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </span>

                    {/* Obra */}
                    <div className="col-span-4 min-w-0 pr-1">
                      <div className="font-bold text-white truncate text-xs">
                        {mov.obra?.cliente || `Obra #${mov.id_obra}`}
                      </div>
                      <div className="text-xs text-zinc-400 font-mono truncate">
                        #{mov.id_obra} {mov.obra?.cidade ? `• ${mov.obra.cidade}` : ''}
                      </div>
                    </div>

                    {/* Quantidade */}
                    <span className="col-span-2 text-right font-mono font-bold text-rose-400 flex items-center justify-end gap-0.5">
                      <ArrowDownRight className="w-3 h-3" />
                      {mov.quantidade_utilizada} {produto.unidade}
                    </span>

                    {/* Responsável */}
                    <div className="col-span-3 text-right min-w-0 text-xs text-zinc-400 truncate">
                      {mov.perfil?.nome_completo || 'Técnico de Campo'}
                      {mov.observacoes && (
                        <span className="block text-xs text-zinc-400 italic truncate" title={mov.observacoes}>
                          {mov.observacoes}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-zinc-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-h-[40px] text-xs"
          >
            Fechar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
