'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
} from 'lucide-react';

interface ObraMateriaisTabProps {
  idObra: number;
}

export function ObraMateriaisTab({ idObra }: ObraMateriaisTabProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [observacao, setObservacao] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'offline'; message: string } | null>(null);

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
    } catch {
      // Ignora erro
    }
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
    return produtos.filter((p) => {
      const matchesCategory = selectedCategory === 'Todos' || p.categoria === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || p.nome.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [produtos, selectedCategory, search]);

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

  // Manipuladores de quantidade (+ / -)
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
        await loadOfflinePending();

        setFeedback({
          type: 'offline',
          message: `📦 ${selectedItems.length} material(is) salvo(s) offline no celular! O saldo será atualizado automaticamente ao reconectar.`,
        });
      } else {
        // FLUXO ONLINE: Insere na tabela obra_materiais (Trigger atualiza saldo)
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

  const handleDeleteLancamento = async (id: string) => {
    if (!isAdmin) return;
    if (confirm('Deseja estornar este material? A quantidade utilizada retornará ao saldo do estoque.')) {
      try {
        await deleteMutation.mutateAsync({ id, id_obra: idObra });
      } catch (err: any) {
        alert(err.message || 'Erro ao estornar material.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header do Módulo */}
      <div className="flex items-center justify-between bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ffc61e]/15 border border-[#ffc61e]/30 flex items-center justify-center text-[#ffc61e]">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white">Consumo de Materiais da Obra</h3>
            <p className="text-xs text-zinc-400">Selecione os itens utilizados na instalação</p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-[#ffc61e] bg-[#ffc61e]/10 px-2.5 py-1 rounded-lg border border-[#ffc61e]/30">
          #{idObra}
        </span>
      </div>

      {/* Alerta de Feedback de Lançamento */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : feedback.type === 'offline'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : feedback.type === 'offline' ? (
            <WifiOff className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Banner de Materiais Offline Pendentes para esta Obra */}
      {offlinePending.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
            <span>
              {offlinePending.length} lançamento(s) salvos no celular aguardando internet.
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => syncEngine.syncAllPendingPhotos({ obraId: idObra })}
            className="h-8 px-3 text-xs bg-[#ffc61e] text-black font-extrabold"
          >
            Sincronizar
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
            placeholder="Buscar material por nome ou código (ex: C-001, cabo)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-zinc-950 border-zinc-800 text-xs text-white placeholder:text-zinc-500 rounded-xl min-h-[44px] focus:ring-2 focus:ring-[#ffc61e]"
          />
        </div>

        {/* Pílulas de Filtro por Categoria */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[36px] ${
                selectedCategory === cat
                  ? 'bg-[#ffc61e] text-black shadow-md'
                  : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grade de Produtos para Seleção de Quantidade */}
      {isLoadingProdutos ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#ffc61e]" />
        </div>
      ) : filteredProdutos.length === 0 ? (
        <div className="text-center py-10 bg-zinc-950/40 rounded-2xl border border-dashed border-zinc-800 p-6 space-y-2">
          <Package className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-xs text-zinc-400 font-medium">Nenhum material encontrado com os filtros atuais.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredProdutos.map((produto) => {
            const currentQty = quantities[produto.id] || 0;
            const isSelected = currentQty > 0;
            const isCable = produto.unidade === 'm';
            const step = isCable ? 5 : 1;

            return (
              <Card
                key={produto.id}
                className={`p-3.5 rounded-2xl transition-all ${
                  isSelected
                    ? 'bg-zinc-900 border-[#ffc61e]/70 shadow-lg ring-1 ring-[#ffc61e]/40'
                    : 'bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col justify-between h-full space-y-3">
                  {/* Topo do Card: Código, Categoria e Saldo */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono font-extrabold text-[#ffc61e] bg-[#ffc61e]/15 px-2 py-0.5 rounded-md border border-[#ffc61e]/30">
                        {produto.codigo}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-semibold px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800">
                        Saldo: <strong className="text-white">{produto.quantidade_saldo}</strong> {produto.unidade}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
                      {produto.nome}
                    </h4>
                  </div>

                  {/* Base do Card: Seletor Táctil de Quantidade */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                    <span className="text-[11px] text-zinc-400 font-medium">
                      Unidade: <strong className="text-zinc-200">{produto.unidade}</strong>
                    </span>

                    <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(produto.id, -1, step)}
                        disabled={currentQty === 0}
                        className="w-8 h-8 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors min-h-[32px] min-w-[32px]"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        step={step}
                        value={currentQty > 0 ? currentQty : ''}
                        placeholder="0"
                        onChange={(e) => handleSetExactQuantity(produto.id, e.target.value)}
                        className="w-12 text-center bg-transparent text-xs font-extrabold font-mono text-white focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => handleQuantityChange(produto.id, 1, step)}
                        className="w-8 h-8 rounded-lg bg-[#ffc61e] text-black hover:bg-[#e5b010] flex items-center justify-center transition-colors min-h-[32px] min-w-[32px] font-bold"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Barra Fixa / Destacada de Confirmação quando houver itens selecionados */}
      {selectedItems.length > 0 && (
        <Card className="p-4 bg-zinc-900 border-[#ffc61e]/50 shadow-2xl rounded-2xl space-y-3 sticky bottom-4 z-20">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#ffc61e]" />
              {selectedItems.length} {selectedItems.length === 1 ? 'material selecionado' : 'materiais selecionados'}
            </span>
            <button
              type="button"
              onClick={() => setQuantities({})}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 underline font-semibold"
            >
              Limpar seleção
            </button>
          </div>

          <div className="space-y-1">
            <input
              type="text"
              placeholder="Observação do lançamento (opcional, ex: sobra de cabo guardada)..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white p-2.5 rounded-xl focus:ring-1 focus:ring-[#ffc61e]"
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
                <Loader2 className="w-4 h-4 animate-spin text-black" /> Gravando materiais...
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
          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-[#ffc61e]" /> Materiais Lançados nesta Obra ({materiaisLancados.length})
          </h4>
        </div>

        {isLoadingLancados ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          </div>
        ) : materiaisLancados.length === 0 ? (
          <div className="text-center py-6 text-zinc-500 text-xs bg-zinc-950/40 rounded-xl border border-zinc-850">
            Nenhum material registrado ainda nesta obra.
          </div>
        ) : (
          <div className="space-y-2">
            {materiaisLancados.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-[#ffc61e] font-extrabold bg-[#ffc61e]/15 px-1.5 py-0.5 rounded">
                      {item.produto?.codigo || 'MAT'}
                    </span>
                    <span className="font-bold text-white truncate">
                      {item.produto?.nome || 'Material'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <span>
                      Qtd: <strong className="text-emerald-400 font-bold">{item.quantidade_utilizada}</strong> {item.produto?.unidade}
                    </span>
                    {item.created_at && (
                      <span>• {new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                    )}
                    {item.perfil?.nome_completo && (
                      <span>• por {item.perfil.nome_completo}</span>
                    )}
                  </div>

                  {item.observacoes && (
                    <p className="text-[11px] text-zinc-400 italic pt-0.5">Obs: {item.observacoes}</p>
                  )}
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteLancamento(item.id)}
                    className="p-2 text-zinc-500 hover:text-red-400 transition-colors shrink-0"
                    title="Estornar lançamento de material"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
