'use client';

import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import Link from 'next/link';
import { useObras, usePerfil } from '@/lib/query/hooks';
import { usePendingPhotosSummary } from '@/lib/sync-engine';
import { ObraCard } from './obra-card';
import { NetworkStatus } from '@/components/network-status';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Search,
  RefreshCw,
  Plus,
  Sun,
  Shield,
  UploadCloud,
  AlertTriangle,
  Loader2,
  Package,
} from 'lucide-react';

/**
 * Função utilitária pura para determinar se uma obra está em andamento/ativa
 * ou se já foi finalizada, enviada para vistoria, homologada ou cancelada.
 */
export function isObraEmAndamento(statusStr?: string | null): boolean {
  if (!statusStr) return true;
  const s = statusStr.toLowerCase().trim();

  // Statuses que representam obras concluídas, em vistoria, homologadas ou finalizadas
  if (
    s.includes('vistoria') ||
    s.includes('conclu') ||
    s.includes('finaliz') ||
    s.includes('homologad') ||
    s.includes('cancel') ||
    s.includes('bloquead') ||
    s.includes('ligad') ||
    s.includes('entregue') ||
    s.includes('aprovad')
  ) {
    return false;
  }

  return true;
}

export function ObrasListPage() {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [activeTab, setActiveTab] = useState<'em_andamento' | 'concluidas' | 'todas'>('em_andamento');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [idsToImport, setIdsToImport] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    errors?: { id: number; message: string }[];
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: perfil } = usePerfil();
  const isAdmin = perfil?.role === 'admin';

  // Monitor reativo de fotos e materiais salvos no IndexedDB local
  const { totalPending, pendingByObra, isSyncing, isOnline, syncAll } = usePendingPhotosSummary();

  // Busca obras com base na pesquisa por texto diferida
  const { data: rawObras, isLoading, isFetching, refetch } = useObras({
    searchQuery: deferredSearch,
  });

  // Separação analítica em tempo real das obras
  const { emAndamentoObras, concluidasObras, totalObras } = useMemo(() => {
    const list = rawObras || [];
    const andamento = list.filter((o) => isObraEmAndamento(o.status));
    const concluidas = list.filter((o) => !isObraEmAndamento(o.status));
    return {
      emAndamentoObras: andamento,
      concluidasObras: concluidas,
      totalObras: list,
    };
  }, [rawObras]);

  // Lista efetivamente renderizada conforme a aba ativa
  const displayedObras = useMemo(() => {
    if (activeTab === 'em_andamento') {
      return emAndamentoObras;
    }
    if (activeTab === 'concluidas') {
      return concluidasObras;
    }
    return totalObras;
  }, [activeTab, emAndamentoObras, concluidasObras, totalObras]);

  const handleBatchImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setFeedback(null);

    const parsedIds = idsToImport
      .split(/[\s,\n]+/)
      .map((str) => Number(str.trim()))
      .filter((num) => !isNaN(num) && num > 0);

    if (parsedIds.length === 0) {
      setFeedback({ type: 'error', message: 'Digite um ou mais IDs numéricos válidos (ex: 462, 463).' });
      return;
    }

    setIsImporting(true);

    try {
      const response = await fetch('/api/import-obra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: parsedIds }),
      });

      const resData = await response.json();

      if (!response.ok) {
        setFeedback({
          type: 'error',
          message: resData.error || 'Falha ao importar obras.',
          errors: resData.details,
        });
        return;
      }

      setFeedback({
        type: 'success',
        message: resData.message || 'Importação realizada com sucesso!',
        errors: resData.errors,
      });

      setIdsToImport('');
      // Ao importar manualmente, alterna para a visão 'todas' para garantir visualização
      setActiveTab('todas');
      refetch();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro de conexão ao importar obras.' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-black text-zinc-100">
      {/* Network Connectivity & Offline Status Bar */}
      <NetworkStatus />

      {/* Header Fixo */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-zinc-800 p-4 shadow-lg">
        <div className="max-w-3xl mx-auto w-full space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#ffc61e] flex items-center justify-center border border-[#ffc61e]/40 shadow-sm">
                <Sun className="w-6 h-6 text-black stroke-[2.5]" />
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <h1 className="text-lg font-bold text-white leading-tight tracking-tight">TORVEN</h1>
                  <p className="text-xs text-[#ffc61e] font-extrabold tracking-widest uppercase">Instaladores</p>
                </div>
                {/* Pill ADMIN para a role admin */}
                {isAdmin && (
                  <span className="text-xs font-extrabold font-mono uppercase bg-[#ffc61e]/20 text-[#ffc61e] border border-[#ffc61e]/50 px-2.5 py-0.5 rounded-full tracking-wider shadow-sm flex items-center gap-1 ml-1">
                    <Shield className="w-3 h-3 text-[#ffc61e]" /> ADMIN
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Botão de Atalho para Gestão de Estoque (Admin Only) */}
              {isAdmin && (
                <Link
                  href="/estoque"
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-black bg-[#ffc61e] hover:bg-[#e5b010] px-3 py-2 rounded-xl shadow-sm transition-all min-h-[44px]"
                  title="Abrir Gestão de Estoque"
                >
                  <Package className="w-4 h-4 stroke-[2.5]" />
                  <span className="hidden sm:inline">Estoque</span>
                </Link>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                disabled={mounted ? isFetching : false}
                title="Atualizar lista"
                aria-label="Atualizar lista de obras"
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 min-h-[48px] min-w-[48px] hover:bg-zinc-800 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 text-zinc-400 ${mounted && isFetching ? 'animate-spin text-[#ffc61e]' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Abas de Filtro com Contadores Reais em Tempo Real (Exclusivo para Administradores) */}
          {isAdmin && (
            <div
              role="tablist"
              aria-label="Filtro de status de obras"
              className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-2xl border border-zinc-800 text-xs font-bold w-full shadow-inner"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'em_andamento'}
                onClick={() => setActiveTab('em_andamento')}
                className={`min-h-[44px] px-2 sm:px-3 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'em_andamento'
                    ? 'bg-[#ffc61e] text-black shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <span className="truncate">Em Andamento</span>
                <span
                  className={`font-mono tabular-nums text-xs px-1.5 py-0.5 rounded-md font-black shrink-0 ${
                    activeTab === 'em_andamento'
                      ? 'bg-black text-[#ffc61e]'
                      : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                  }`}
                >
                  {emAndamentoObras.length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'concluidas'}
                onClick={() => setActiveTab('concluidas')}
                className={`min-h-[44px] px-2 sm:px-3 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'concluidas'
                    ? 'bg-[#ffc61e] text-black shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <span className="truncate">Concluídas</span>
                <span
                  className={`font-mono tabular-nums text-xs px-1.5 py-0.5 rounded-md font-black shrink-0 ${
                    activeTab === 'concluidas'
                      ? 'bg-black text-[#ffc61e]'
                      : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                  }`}
                >
                  {concluidasObras.length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'todas'}
                onClick={() => setActiveTab('todas')}
                className={`min-h-[44px] px-2 sm:px-3 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'todas'
                    ? 'bg-[#ffc61e] text-black shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <span className="truncate">Todas</span>
                <span
                  className={`font-mono tabular-nums text-xs px-1.5 py-0.5 rounded-md font-black shrink-0 ${
                    activeTab === 'todas'
                      ? 'bg-black text-[#ffc61e]'
                      : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                  }`}
                >
                  {totalObras.length}
                </span>
              </button>
            </div>
          )}

          {/* Input de Busca com Foco em Alto Contraste */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
            <Input
              type="text"
              placeholder="Buscar por cliente, ID ou cidade..."
              aria-label="Buscar por cliente, ID ou cidade"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800 focus:border-[#ffc61e] text-sm text-zinc-100 placeholder:text-zinc-400 min-h-[48px]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1.5 text-xs text-[#ffc61e] bg-zinc-800 hover:bg-zinc-700 px-3 min-h-[36px] h-[36px] rounded-lg font-semibold transition-colors flex items-center justify-center min-w-[44px]"
                title="Limpar busca"
                aria-label="Limpar busca"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 max-w-3xl mx-auto w-full space-y-4">
        {/* Banner Informativo de Fotos/Materiais Pendentes no Celular */}
        {totalPending > 0 && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between shadow-lg transition-all ${
              !isOnline
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-[#ffc61e]/15 border-[#ffc61e]/40 text-[#ffc61e]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {!isOnline ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              ) : isSyncing ? (
                <Loader2 className="w-5 h-5 text-[#ffc61e] animate-spin shrink-0" />
              ) : (
                <UploadCloud className="w-5 h-5 text-[#ffc61e] shrink-0" />
              )}
              <div className="text-xs font-bold leading-tight truncate">
                {!isOnline ? (
                  <span>
                    ⚠️ Você tem <strong className="text-amber-200">{totalPending} item(ns)</strong> salvo(s) no celular aguardando internet para sincronizar com a nuvem
                  </span>
                ) : isSyncing ? (
                  <span>
                    Sincronizando <strong className="text-white">{totalPending} item(ns)</strong> com a nuvem...
                  </span>
                ) : (
                  <span>
                    ⚠️ <strong className="text-white">{totalPending} item(ns)</strong> aguardando sincronização
                  </span>
                )}
              </div>
            </div>

            {isOnline && !isSyncing && (
              <Button
                size="sm"
                onClick={() => syncAll()}
                className="h-8 px-3 text-xs bg-[#ffc61e] text-black hover:bg-[#e5b010] font-extrabold border-none shrink-0 ml-2 shadow-sm min-h-[36px]"
              >
                Sincronizar Agora
              </Button>
            )}
          </div>
        )}

        {/* Lista de Obras com Altura Mínima Estável para Evitar Saltos */}
        <div className="min-h-[480px]">
          {!mounted || isLoading ? (
            <div className="space-y-3.5 pt-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 rounded-xl bg-zinc-900/60 border border-zinc-800/60 animate-pulse p-4 space-y-3">
                  <div className="flex justify-between">
                    <div className="h-4 w-24 bg-zinc-800 rounded"></div>
                    <div className="h-6 w-16 bg-zinc-800 rounded-full"></div>
                  </div>
                  <div className="h-6 w-3/4 bg-zinc-800 rounded"></div>
                  <div className="h-4 w-1/2 bg-zinc-800 rounded"></div>
                </div>
              ))}
            </div>
          ) : displayedObras.length > 0 ? (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1 font-medium">
                <span>
                  {displayedObras.length} {displayedObras.length === 1 ? 'obra exibida' : 'obras exibidas'}
                  {isAdmin &&
                    (activeTab === 'em_andamento'
                      ? ' (Em Andamento)'
                      : activeTab === 'concluidas'
                      ? ' (Concluídas / Vistoria)'
                      : ' (Visão Completa)')}
                </span>
              </div>
              <div className="flex flex-col space-y-3.5">
                {displayedObras.map((obra) => (
                  <ObraCard
                    key={obra.id_obra}
                    obra={obra}
                    pendingPhotosCount={pendingByObra[obra.id_obra] || 0}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shadow-inner">
                <Sun className="w-8 h-8 text-[#ffc61e]/60" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h3 className="text-base font-bold text-zinc-200">
                  {search
                    ? 'Nenhuma obra encontrada na busca'
                    : isAdmin && activeTab === 'concluidas'
                    ? 'Nenhuma obra concluída no momento'
                    : isAdmin && activeTab === 'todas'
                    ? 'Nenhuma obra cadastrada no sistema'
                    : 'Nenhuma obra em andamento no momento'}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {search
                    ? 'Tente buscar com outros termos de cliente, cidade ou ID.'
                    : isAdmin && activeTab === 'concluidas'
                    ? 'As obras finalizadas, com vistoria concluída ou homologadas aparecerão aqui.'
                    : isAdmin && activeTab === 'todas'
                    ? 'Você pode importar novas obras pelo botão "+" ou aguardar atualizações.'
                    : 'Todas as suas obras ativas já foram concluídas ou aguardam novas ordens de serviço.'}
                </p>
              </div>
              {!search && isAdmin && (
                <Button onClick={() => setImportDialogOpen(true)} variant="default" size="sm" className="min-h-[48px] px-5">
                  <Plus className="w-4 h-4 mr-1.5" /> Importar Obra(s)
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button (FAB) exclusivo para Administradores */}
      {isAdmin && (
        <button
          type="button"
          onClick={() => setImportDialogOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#ffc61e] text-black shadow-lg flex items-center justify-center hover:bg-[#e5b010] active:scale-95 focus-visible:ring-2 focus-visible:ring-[#ffc61e] focus-visible:outline-none transition-all duration-150 border border-[#ffc61e]/40"
          title="Importar Obra(s) do CRM Groner (Admin)"
          aria-label="Importar Obra(s) do CRM Groner (Admin)"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      )}

      {/* Modal / Dialog para Importação em Lote (Admin Only) */}
      {isAdmin && (
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#ffc61e]" />
              <span>Importar Obra(s) do Groner</span>
            </DialogTitle>
            <DialogDescription>
              Digite os IDs das obras separados por vírgula, espaço ou quebra de linha.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBatchImport} className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300">IDs das Obras no Groner</label>
              <textarea
                value={idsToImport}
                onChange={(e) => setIdsToImport(e.target.value)}
                placeholder="Exemplo: 462, 463, 464"
                rows={4}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#ffc61e]"
                disabled={isImporting}
              />
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}
              >
                <p>{feedback.message}</p>
                {feedback.errors && feedback.errors.length > 0 && (
                  <ul className="mt-1.5 list-disc list-inside space-y-0.5 text-xs">
                    {feedback.errors.map((err) => (
                      <li key={err.id}>
                        Obra #{err.id}: {err.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setImportDialogOpen(false)}
                disabled={isImporting}
                className="min-h-[44px]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isImporting}
                className="bg-[#ffc61e] text-black hover:bg-[#e5b010] font-extrabold min-h-[44px]"
              >
                {isImporting ? 'Importando...' : 'Iniciar Importação'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
