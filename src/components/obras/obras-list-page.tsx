'use client';

import React, { useState, useEffect } from 'react';
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
  WifiOff,
} from 'lucide-react';

export function ObrasListPage() {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [adminTab, setAdminTab] = useState<'em_andamento' | 'todas'>('em_andamento');
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

  // Monitor reativo de fotos salvas no IndexedDB local
  const { totalPending, pendingByObra, isSyncing, isOnline, syncAll } = usePendingPhotosSummary();

  // Se não for admin, ou se a aba 'em_andamento' estiver ativa, oculta 'Vistoria Solicitada'
  const shouldExcludeVistoria = !isAdmin || adminTab === 'em_andamento';

  const { data: obras, isLoading, isFetching, refetch } = useObras({
    searchQuery: search,
    excludeStatus: shouldExcludeVistoria ? 'Vistoria Solicitada' : undefined,
  });

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
      // Ao importar manualmente, alterna para a visão 'todas' para garantir visualização de qualquer status
      setAdminTab('todas');
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

          {/* Abas de Filtro para Administradores (Em Andamento vs Todas) */}
          {isAdmin && (
            <div role="tablist" aria-label="Filtro de status de obras" className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-bold w-full">
              <button
                type="button"
                role="tab"
                aria-selected={adminTab === 'em_andamento'}
                onClick={() => setAdminTab('em_andamento')}
                className={`flex-1 min-h-[44px] px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  adminTab === 'em_andamento'
                    ? 'bg-[#ffc61e] text-black shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <span>Em Andamento</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={adminTab === 'todas'}
                onClick={() => setAdminTab('todas')}
                className={`flex-1 min-h-[44px] px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  adminTab === 'todas'
                    ? 'bg-[#ffc61e] text-black shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <span>Todas as Obras (Admin)</span>
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
        {/* Banner Informativo de Fotos Pendentes no Celular (Polished Alert Banner) */}
        {totalPending > 0 && (
          <div
            role="status"
            aria-live="polite"
            className={`p-4 rounded-2xl border shadow-xl transition-all duration-300 ${
              !isOnline
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-200 shadow-amber-950/20'
                : isSyncing
                ? 'bg-zinc-950 border-[#ffc61e]/50 text-white shadow-[#ffc61e]/10'
                : 'bg-zinc-950 border-[#ffc61e]/60 text-zinc-100 shadow-black/40'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    !isOnline
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                      : isSyncing
                      ? 'bg-[#ffc61e]/20 border-[#ffc61e]/40 text-[#ffc61e]'
                      : 'bg-[#ffc61e]/15 border-[#ffc61e]/30 text-[#ffc61e]'
                  }`}
                >
                  {!isOnline ? (
                    <WifiOff className="w-5 h-5 text-amber-400" aria-hidden="true" />
                  ) : isSyncing ? (
                    <Loader2 className="w-5 h-5 text-[#ffc61e] animate-spin" aria-hidden="true" />
                  ) : (
                    <UploadCloud className="w-5 h-5 text-[#ffc61e]" aria-hidden="true" />
                  )}
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-extrabold text-white leading-tight">
                      {!isOnline
                        ? 'Modo Offline • Fotos Salvas no Dispositivo'
                        : isSyncing
                        ? 'Sincronizando com a Nuvem...'
                        : 'Fotos de Campo Prontas para Envio'}
                    </h3>
                    <span
                      className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded-full border ${
                        !isOnline
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-[#ffc61e]/20 text-[#ffc61e] border-[#ffc61e]/50'
                      }`}
                    >
                      {totalPending} {totalPending === 1 ? 'registro' : 'registros'}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-normal">
                    {!isOnline
                      ? 'O envio automático iniciará assim que o celular recuperar o sinal de internet.'
                      : isSyncing
                      ? 'Fazendo upload seguro e comprimido para o servidor da Torven.'
                      : 'Conexão ativa detectada. Envie os registros para atualizar o escritório.'}
                  </p>
                </div>
              </div>

              {isOnline && !isSyncing && (
                <Button
                  size="sm"
                  onClick={() => syncAll()}
                  className="min-h-[44px] h-11 px-4 bg-[#ffc61e] hover:bg-[#e5b010] text-black font-extrabold text-xs rounded-xl shadow-md border border-[#ffc61e]/40 transition-all flex items-center justify-center gap-2 shrink-0 self-stretch sm:self-auto active:scale-[0.98]"
                >
                  <UploadCloud className="w-4 h-4 text-black stroke-[2.4]" aria-hidden="true" />
                  <span>Sincronizar Agora</span>
                </Button>
              )}
            </div>
          </div>
        )}

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
        ) : obras && obras.length > 0 ? (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1 font-medium">
              <span>
                {obras.length} {obras.length === 1 ? 'obra encontrada' : 'obras encontradas'}
                {isAdmin && adminTab === 'todas' && ' (Visão Completa)'}
              </span>
            </div>
            <div className="flex flex-col space-y-3.5">
              {obras.map((obra) => (
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
                {search ? 'Nenhuma obra encontrada' : 'Nenhuma obra cadastrada'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {search
                  ? 'Tente buscar com outros termos de cliente, cidade ou ID.'
                  : isAdmin
                  ? 'Importe obras do CRM Groner usando o botão "+" abaixo.'
                  : 'Aguarde o envio das obras pelo escritório.'}
              </p>
            </div>
            {!search && isAdmin && (
              <Button onClick={() => setImportDialogOpen(true)} variant="default" size="sm" className="min-h-[48px] px-5">
                <Plus className="w-4 h-4 mr-1.5" /> Importar Obra(s)
              </Button>
            )}
          </div>
        )}
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
                  <ul className="mt-1.5 list-disc list-inside space-y-0.5 text-xs text-zinc-300">
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
