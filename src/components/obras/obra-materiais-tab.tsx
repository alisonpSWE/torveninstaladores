'use client';

import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import {
  useEstoqueProdutos,
  useObraMateriais,
  useRegistrarMaterial,
  useDeleteObraMaterial,
  usePerfil,
} from '@/lib/query/hooks';
import {
  saveMaterialOffline,
  getOfflineMateriaisByObra,
  OfflineMaterialRecord,
} from '@/lib/offline-materiais-store';
import { syncEngine } from '@/lib/sync-engine';
import { Obra, EstoqueProduto, ObraMaterial, ObraMaterialComProduto } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Package,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Loader2,
  WifiOff,
  Layers,
  History,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
} from 'lucide-react';

interface ObraMateriaisTabProps {
  idObra: number;
  obra?: Obra;
}

export function ObraMateriaisTab({ idObra, obra }: ObraMateriaisTabProps) {
  const draftStorageKey = `torven_draft_mat_${idObra}`;
  const draftObsKey = `torven_draft_obs_${idObra}`;

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Rascunho resiliente: recupera do localStorage se a página recarregar no telhado
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(draftStorageKey);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  const [observacao, setObservacao] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(draftObsKey) || '';
      } catch {}
    }
    return '';
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'offline'; message: string } | null>(null);

  // Modal de Estorno de Material (Zero alert/confirm nativo)
  const [estornoModalOpen, setEstornoModalOpen] = useState(false);
  const [itemParaEstorno, setItemParaEstorno] = useState<ObraMaterialComProduto | null>(null);
  const [motivoEstorno, setMotivoEstorno] = useState('Sobra de obra devolvida ao galpão');
  const [isDeleting, setIsDeleting] = useState(false);

  // Persistir rascunho de materiais automaticamente
  useEffect(() => {
    try {
      if (Object.keys(quantities).length > 0) {
        localStorage.setItem(draftStorageKey, JSON.stringify(quantities));
      } else {
        localStorage.removeItem(draftStorageKey);
      }
    } catch {}
  }, [quantities, draftStorageKey]);

  useEffect(() => {
    try {
      if (observacao) {
        localStorage.setItem(draftObsKey, observacao);
      } else {
        localStorage.removeItem(draftObsKey);
      }
    } catch {}
  }, [observacao, draftObsKey]);

  // Queries
  const { data: produtos = [], isLoading: isLoadingProdutos } = useEstoqueProdutos();
  const { data: materiaisLancados = [], isLoading: isLoadingLancados } = useObraMateriais(idObra);
  const { data: perfil } = usePerfil();
  const isAdmin = perfil?.role === 'admin';

  // Mutations
  const registrarMutation = useRegistrarMaterial();
  const deleteMutation = useDeleteObraMaterial();

  // Materiais offline pendentes no IndexedDB para esta obra
  const [offlinePending, setOfflinePending] = useState<OfflineMaterialRecord[]>([]);

  const loadOfflinePending = async () => {
    try {
      const pending = await getOfflineMateriaisByObra(idObra);
      setOfflinePending(pending);
    } catch {}
  };

  useEffect(() => {
    loadOfflinePending();

    const handleSyncEvent = () => loadOfflinePending();
    window.addEventListener('online', handleSyncEvent);
    window.addEventListener('torven-sync-completed', handleSyncEvent);

    return () => {
      window.removeEventListener('online', handleSyncEvent);
      window.removeEventListener('torven-sync-completed', handleSyncEvent);
    };
  }, [idObra]);

  // Lista de categorias únicas extraídas dos produtos
  const categories = useMemo(() => {
    const set = new Set<string>();
    produtos.forEach((p) => {
      if (p.categoria) set.add(p.categoria);
    });
    return ['Todos', ...Array.from(set)];
  }, [produtos]);

  // Produtos filtrados por busca e categoria
  const filteredProdutos = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    return produtos.filter((p) => {
      const matchesCategory = selectedCategory === 'Todos' || p.categoria === selectedCategory;
      const matchesSearch = !q || p.nome.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [produtos, selectedCategory, deferredSearch]);

  // Itens atualmente selecionados com quantidade > 0
  const selectedItems = useMemo(() => {
    return Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const prod = produtos.find((p) => p.id === id);
        return { produto: prod!, quantidade: qty };
      })
      .filter((item) => item.produto !== undefined);
  }, [quantities, produtos]);

  // Manipuladores de quantidade (+ / - / atalhos)
  const handleQuantityChange = (id: string, delta: number, step: number = 1) => {
    setQuantities((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta * step);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const handleAddQuickDelta = (id: string, amount: number) => {
    setQuantities((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + amount);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const handleSetExactQuantity = (id: string, value: string) => {
    const num = parseFloat(value);
    setQuantities((prev) => {
      if (isNaN(num) || num <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: num };
    });
  };

  // Submissão do Lançamento de Materiais (Online ou Offline)
  const handleConfirmMateriais = async () => {
    if (selectedItems.length === 0) return;

    setIsSubmitting(true);
    setFeedback(null);

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    try {
      if (!isOnline) {
        // FLUXO OFFLINE: Grava cada item no IndexedDB
        for (const item of selectedItems) {
          await saveMaterialOffline(
            idObra,
            item.produto.id,
            item.quantidade,
            item.produto.nome,
            item.produto.codigo,
            item.produto.unidade,
            observacao.trim() || null
          );
        }

        setQuantities({});
        setObservacao('');
        localStorage.removeItem(draftStorageKey);
        localStorage.removeItem(draftObsKey);
        await loadOfflinePending();

        setFeedback({
          type: 'offline',
          message: `📦 ${selectedItems.length} material(is) salvo(s) offline no celular! O saldo será atualizado automaticamente ao reconectar.`,
        });
      } else {
        // FLUXO ONLINE: Insere na tabela obra_materiais
        for (const item of selectedItems) {
          await registrarMutation.mutateAsync({
            id_obra: idObra,
            id_produto: item.produto.id,
            quantidade_utilizada: item.quantidade,
            observacoes: observacao.trim() || null,
          });
        }

        setQuantities({});
        setObservacao('');
        localStorage.removeItem(draftStorageKey);
        localStorage.removeItem(draftObsKey);

        setFeedback({
          type: 'success',
          message: `✅ ${selectedItems.length} material(is) registrado(s) com sucesso na obra!`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao registrar materiais.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir Modal de Estorno de Material (Zero alert/confirm nativo)
  const handleOpenEstornoModal = (item: ObraMaterial) => {
    if (!isAdmin) return;
    setItemParaEstorno(item);
    setMotivoEstorno('Sobra de obra devolvida ao galpão');
    setEstornoModalOpen(true);
  };

  const handleConfirmEstorno = async () => {
    if (!itemParaEstorno) return;
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({ id: itemParaEstorno.id, id_obra: idObra });
      setEstornoModalOpen(false);
      setItemParaEstorno(null);
      setFeedback({
        type: 'success',
        message: `Material estornado com sucesso! O saldo retornou ao estoque central.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao estornar material.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header do Módulo com Contexto Técnico da Obra */}
      <div className="flex items-center justify-between bg-zinc-950 p-4 rounded-2xl border border-zinc-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#ffc61e]/15 border border-[#ffc61e]/30 flex items-center justify-center text-[#ffc61e] shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              Consumo de Materiais da Obra
              {obra?.potencia_total_kwp ? (
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  {obra.potencia_total_kwp} kWp
                </span>
              ) : null}
            </h3>
            <p className="text-xs text-zinc-400">
              {obra?.qtd_modulos ? `${obra.qtd_modulos} placas • ` : ''}Selecione e registre os itens consumidos
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-[#ffc61e] bg-[#ffc61e]/10 px-3 py-1.5 rounded-xl border border-[#ffc61e]/30">
          #{idObra}
        </span>
      </div>

      {/* Alerta de Feedback de Lançamento */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : feedback.type === 'offline'
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : feedback.type === 'offline' ? (
              <WifiOff className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>

          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 text-zinc-400 hover:text-white rounded-lg"
            aria-label="Fechar mensagem"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Banner de Materiais Offline Pendentes para esta Obra */}
      {offlinePending.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
            <span>
              {offlinePending.length} lançamento(s) salvos no celular aguardando internet.
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => syncEngine.syncAllPendingPhotos({ obraId: idObra })}
            className="min-h-[44px] px-4 text-xs bg-[#ffc61e] text-black font-extrabold hover:bg-[#e5b010] rounded-xl"
          >
            Sincronizar Agora
          </Button>
        </div>
      )}

      {/* Controles de Filtro e Busca */}
      <div className="space-y-3">
        {/* Campo de Busca Rápida */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
          <Input
            type="text"
            placeholder="Buscar material por código ou nome (ex: CAB-001, inversor, conector)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-zinc-950 border-zinc-800 text-xs text-white placeholder:text-zinc-500 rounded-xl min-h-[44px] focus:ring-2 focus:ring-[#ffc61e]"
          />
        </div>

        {/* Pílulas de Filtro por Categoria (Alvos >= 44px) */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[44px] flex items-center justify-center ${
                selectedCategory === cat
                  ? 'bg-[#ffc61e] text-black shadow-md font-extrabold'
                  : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:bg-zinc-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grade de Produtos para Seleção de Quantidade (com altura mínima estável) */}
      <div className="min-h-[360px]">
        {isLoadingProdutos ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#ffc61e]" />
          </div>
        ) : filteredProdutos.length === 0 ? (
          <div className="text-center py-10 bg-zinc-950/40 rounded-2xl border border-dashed border-zinc-800 p-6 space-y-2">
            <Package className="w-8 h-8 text-zinc-500 mx-auto" />
            <p className="text-xs text-zinc-400 font-medium">Nenhum material encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredProdutos.map((produto) => {
              const currentQty = quantities[produto.id] || 0;
              const isSelected = currentQty > 0;
              const isCable = produto.unidade === 'm';
              const saldoEstoque = Number(produto.quantidade_saldo || 0);
              const exceedsStock = currentQty > saldoEstoque;

              return (
                <Card
                  key={produto.id}
                  className={`p-4 rounded-2xl transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_160px] ${
                    isSelected
                      ? 'bg-zinc-900 border-[#ffc61e] shadow-lg ring-1 ring-[#ffc61e]/40'
                      : 'bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                <div className="flex flex-col justify-between h-full space-y-3">
                  {/* Topo do Card: Código, Categoria e Saldo Físico */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-mono font-black text-[#ffc61e] bg-[#ffc61e]/15 px-2 py-0.5 rounded-md border border-[#ffc61e]/30">
                        {produto.codigo}
                      </span>
                      <span className="text-xs text-zinc-400 font-semibold px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 font-mono tabular-nums">
                        Saldo: <strong className="text-white">{produto.quantidade_saldo}</strong> {produto.unidade}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
                      {produto.nome}
                    </h4>

                    {/* Alerta quando o lançamento excede o saldo físico */}
                    {exceedsStock && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/15 p-2 rounded-lg border border-amber-500/30 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Excede saldo em estoque ({saldoEstoque} {produto.unidade})</span>
                      </div>
                    )}
                  </div>

                  {/* Atalhos Rápidos de Incremento (Pílulas de Toque Fácil) */}
                  <div className="space-y-2 pt-1 border-t border-zinc-800/60">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-zinc-400 font-medium mr-1">Atalhos:</span>
                      {isCable ? (
                        <>
                          {[5, 10, 25, 50].map((delta) => (
                            <button
                              key={delta}
                              type="button"
                              onClick={() => handleAddQuickDelta(produto.id, delta)}
                              className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-zinc-900 text-zinc-300 hover:text-black hover:bg-[#ffc61e] border border-zinc-800 transition-colors min-h-[34px]"
                            >
                              +{delta}m
                            </button>
                          ))}
                        </>
                      ) : (
                        <>
                          {[1, 5, 10, 20].map((delta) => (
                            <button
                              key={delta}
                              type="button"
                              onClick={() => handleAddQuickDelta(produto.id, delta)}
                              className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-zinc-900 text-zinc-300 hover:text-black hover:bg-[#ffc61e] border border-zinc-800 transition-colors min-h-[34px]"
                            >
                              +{delta}
                            </button>
                          ))}
                        </>
                      )}
                    </div>

                    {/* Seletor Táctil Principal (>= 44px) */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-zinc-400 font-medium">
                        Unidade: <strong className="text-zinc-200">{produto.unidade}</strong>
                      </span>

                      <div className="flex items-center gap-2 bg-black/80 p-1 rounded-xl border border-zinc-800">
                        {/* Botão Diminuir (-) >= 44px */}
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(produto.id, -1, isCable ? 5 : 1)}
                          disabled={currentQty === 0}
                          className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors active:scale-95 border border-zinc-800"
                          aria-label={`Diminuir quantidade de ${produto.nome}`}
                        >
                          <Minus className="w-4 h-4 stroke-[3]" />
                        </button>

                        {/* Input Numérico Mobile */}
                        <input
                          type="number"
                          inputMode="decimal"
                          pattern="[0-9]*"
                          min="0"
                          step={isCable ? '5' : '1'}
                          value={currentQty > 0 ? currentQty : ''}
                          placeholder="0"
                          onChange={(e) => handleSetExactQuantity(produto.id, e.target.value)}
                          className="w-16 h-11 text-center bg-transparent text-sm font-black font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#ffc61e] rounded-lg tabular-nums"
                          aria-label={`Quantidade de ${produto.nome}`}
                        />

                        {/* Botão Aumentar (+) >= 44px */}
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(produto.id, 1, isCable ? 5 : 1)}
                          className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-[#ffc61e] text-black hover:bg-[#e5b010] flex items-center justify-center transition-colors font-black active:scale-95 shadow"
                          aria-label={`Aumentar quantidade de ${produto.nome}`}
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          </div>
        )}
      </div>

      {/* Barra Fixa / Destacada de Confirmação quando houver itens selecionados */}
      {selectedItems.length > 0 && (
        <Card className="p-4 sm:p-5 bg-zinc-900 border-[#ffc61e]/50 shadow-2xl rounded-2xl space-y-3 sticky bottom-4 z-20 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#ffc61e]" />
              {selectedItems.length} {selectedItems.length === 1 ? 'material selecionado' : 'materiais selecionados'}
            </span>
            <button
              type="button"
              onClick={() => {
                setQuantities({});
                localStorage.removeItem(draftStorageKey);
              }}
              className="text-xs text-zinc-400 hover:text-rose-400 underline font-semibold min-h-[36px] px-2 py-1 flex items-center"
            >
              Limpar seleção
            </button>
          </div>

          {/* Resumo dos Itens Selecionados no Lançamento */}
          <div className="flex gap-1.5 overflow-x-auto py-1 no-scrollbar text-xs">
            {selectedItems.map((item) => (
              <span
                key={item.produto.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 whitespace-nowrap font-mono"
              >
                <strong className="text-white">{item.produto.nome.slice(0, 20)}</strong>
                <span className="text-[#ffc61e] font-black">
                  {item.quantidade} {item.produto.unidade}
                </span>
              </span>
            ))}
          </div>

          <div className="space-y-1">
            <input
              type="text"
              placeholder="Observação do lançamento (opcional, ex: sobra de cabo guardada)..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white p-3 rounded-xl min-h-[44px] focus:ring-2 focus:ring-[#ffc61e]"
            />
          </div>

          <Button
            type="button"
            onClick={handleConfirmMateriais}
            disabled={isSubmitting}
            className="w-full h-12 bg-[#ffc61e] hover:bg-[#e5b010] text-black font-extrabold text-xs rounded-xl shadow-lg border border-[#ffc61e]/40 transition-all min-h-[48px]"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-black" /> Gravando materiais no estoque...
              </span>
            ) : (
              `Confirmar ${selectedItems.length} Material(is) Utilizado(s)`
            )}
          </Button>
        </Card>
      )}

      {/* Histórico de Materiais já Lançados nesta Obra */}
      <div className="space-y-3 pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-[#ffc61e]" /> Materiais Lançados nesta Obra ({materiaisLancados.length})
          </h4>
        </div>

        {isLoadingLancados ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          </div>
        ) : materiaisLancados.length === 0 ? (
          <div className="text-center py-6 text-zinc-400 text-xs bg-zinc-950/40 rounded-xl border border-zinc-850">
            Nenhum material registrado ainda nesta obra.
          </div>
        ) : (
          <div className="space-y-2">
            {materiaisLancados.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs"
              >
                <div className="space-y-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-[#ffc61e] font-extrabold bg-[#ffc61e]/15 px-1.5 py-0.5 rounded">
                      {item.produto?.codigo || 'MAT'}
                    </span>
                    <span className="font-bold text-white truncate">
                      {item.produto?.nome || 'Material'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono tabular-nums">
                    <span>
                      Qtd: <strong className="text-emerald-400 font-bold">{item.quantidade_utilizada}</strong> {item.produto?.unidade}
                    </span>
                    {item.created_at && (
                      <span>• {new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                    )}
                    {item.perfil?.nome_completo && (
                      <span className="font-sans">• por {item.perfil.nome_completo}</span>
                    )}
                  </div>

                  {item.observacoes && (
                    <p className="text-xs text-zinc-400 italic pt-0.5">Obs: {item.observacoes}</p>
                  )}
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleOpenEstornoModal(item)}
                    className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors shrink-0 flex items-center justify-center"
                    title="Estornar lançamento de material"
                    aria-label={`Estornar lançamento de ${item.produto?.nome || 'material'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE ESTORNO DE MATERIAL (Zero window.confirm) */}
      <Dialog open={estornoModalOpen} onOpenChange={setEstornoModalOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-400 text-base font-bold">
            <RotateCcw className="w-5 h-5" /> Confirmar Estorno de Material
          </DialogTitle>
          <DialogDescription className="text-zinc-300 text-xs pt-1 leading-relaxed">
            Ao estornar, a quantidade de <strong className="text-white">{itemParaEstorno?.quantidade_utilizada} {itemParaEstorno?.produto?.unidade}</strong> de <strong className="text-white">{itemParaEstorno?.produto?.nome}</strong> retornará automaticamente ao saldo disponível no almoxarifado central.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2 text-xs">
          <label className="block text-zinc-400 font-semibold uppercase tracking-wider">
            Motivo do Estorno / Devolução:
          </label>
          <div className="space-y-2">
            {[
              'Sobra de obra devolvida ao galpão',
              'Erro de digitação / lançamento duplicado',
              'Material avariado / defeituoso',
              'Mudança no escopo de instalação',
            ].map((motivo) => (
              <label
                key={motivo}
                onClick={() => setMotivoEstorno(motivo)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  motivoEstorno === motivo
                    ? 'bg-[#ffc61e]/15 border-[#ffc61e] text-white font-bold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900'
                }`}
              >
                <input
                  type="radio"
                  name="motivoEstorno"
                  checked={motivoEstorno === motivo}
                  onChange={() => setMotivoEstorno(motivo)}
                  className="accent-[#ffc61e]"
                />
                <span>{motivo}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setEstornoModalOpen(false)}
            disabled={isDeleting}
            className="min-h-[48px] px-4 text-xs font-semibold"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleConfirmEstorno}
            disabled={isDeleting}
            className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold min-h-[48px] px-5 text-xs shadow-lg flex items-center gap-1.5"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            <span>Confirmar Estorno no Saldo</span>
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
