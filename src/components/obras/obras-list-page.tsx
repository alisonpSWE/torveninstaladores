'use client';

import React, { useState, useEffect } from 'react';
import { useObras, useImportObra } from '@/lib/query/hooks';
import { ObraCard } from './obra-card';
import { NetworkStatus } from '@/components/network-status';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, RefreshCw, Plus, Sun, AlertCircle, CheckCircle2, Loader2, Layers } from 'lucide-react';

export function ObrasListPage() {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [idsToImport, setIdsToImport] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    errors?: { id: number; message: string }[];
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: obras, isLoading, isFetching, refetch } = useObras({
    searchQuery: search,
    excludeStatus: 'Vistoria Solicitada',
  });

  const importMutation = useImportObra();

  const handleBatchImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const parsedIds = idsToImport
      .split(/[\s,\n]+/)
      .map((str) => Number(str.trim()))
      .filter((num) => !isNaN(num) && num > 0);

    if (parsedIds.length === 0) {
      setFeedback({ type: 'error', message: 'Digite um ou mais IDs numéricos válidos (ex: 462, 463).' });
      return;
    }

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
      refetch();
      // Retained diagnostics feedback for technician inspection; user manually closes dialog.
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro de conexão ao importar obras.' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-black text-zinc-100">
      {/* Network Connectivity & Offline Status Bar */}
      <NetworkStatus />

      {/* Header Fixo */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-zinc-800 p-4 shadow-lg">
        <div className="max-w-5xl mx-auto w-full space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#ffc61e] flex items-center justify-center border border-[#ffc61e]/40 shadow-sm">
                <Sun className="w-6 h-6 text-black stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-tight tracking-tight">TORVEN</h1>
                <p className="text-xs text-[#ffc61e] font-extrabold tracking-widest uppercase">Instaladores</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={mounted ? isFetching : false}
              title="Atualizar lista"
              aria-label="Atualizar lista de obras"
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 min-h-[44px] min-w-[44px]"
            >
              <RefreshCw className={`w-4 h-4 text-zinc-400 ${mounted && isFetching ? 'animate-spin text-[#ffc61e]' : ''}`} />
            </Button>
          </div>

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
                className="absolute right-3 top-2.5 text-xs text-[#ffc61e] bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded-md font-semibold transition-colors min-h-[36px] flex items-center"
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
      <main className="flex-1 p-4 max-w-5xl mx-auto w-full space-y-3">
        {!mounted || isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-zinc-900/60 border border-zinc-800/60 animate-pulse p-4 space-y-3">
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
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
              <span>
                {obras.length} {obras.length === 1 ? 'obra encontrada' : 'obras encontradas'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {obras.map((obra) => (
                <ObraCard key={obra.id_obra} obra={obra} />
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
                  : 'Importe obras do CRM Groner usando o botão "+" abaixo.'}
              </p>
            </div>
            {!search && (
              <Button onClick={() => setImportDialogOpen(true)} variant="default" size="sm" className="min-h-[44px]">
                <Plus className="w-4 h-4 mr-1.5" /> Importar Obra(s)
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) com Safe-Area Margin */}
      <button
        onClick={() => setImportDialogOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#ffc61e] text-black shadow-lg flex items-center justify-center hover:bg-[#e5b010] active:scale-95 transition-all duration-150 border border-[#ffc61e]/40"
        title="Importar Obra(s) do CRM Groner"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      {/* Modal / Dialog para Importação em Lote */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#ffc61e]" /> Importar Obra(s) do CRM Groner
          </DialogTitle>
          <DialogDescription>
            Digite um ou múltiplos IDs numéricos do Groner separados por vírgula (ex: 462, 463, 464) para sincronizar antes de ir para o campo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleBatchImport} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">IDs das Obras (Groner)</label>
            <textarea
              rows={3}
              placeholder="Ex: 462, 463, 464"
              value={idsToImport}
              onChange={(e) => setIdsToImport(e.target.value)}
              disabled={importMutation.isPending}
              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#ffc61e] font-mono"
            />
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs space-y-1 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>

              {feedback.errors && feedback.errors.length > 0 && (
                <div className="text-xs pt-1 text-red-300 space-y-0.5 border-t border-red-500/20">
                  {feedback.errors.map((err, idx) => (
                    <div key={idx}>
                      • Obra #{err.id}: {err.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
              disabled={importMutation.isPending}
              className="min-h-[44px]"
            >
              {feedback?.type === 'success' ? 'Fechar' : 'Cancelar'}
            </Button>
            <Button type="submit" disabled={importMutation.isPending} className="min-h-[44px]">
              {importMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando...
                </>
              ) : (
                'Importar Obra(s)'
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
