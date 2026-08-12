'use client';

import React, { useState, useEffect } from 'react';
import { useObras, useImportObra } from '@/lib/query/hooks';
import { ObraCard } from './obra-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, RefreshCw, Plus, Sun, AlertCircle, CheckCircle2, Loader2, Layers, Filter } from 'lucide-react';

export function ObrasListPage() {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'analise' | 'todas'>('analise');
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

  // Regra de Negócio Estrita:
  // Modo 'analise': Exibe obras em 'Em Análise Técnica', 'Documentação em Análise', etc., e EXCLUI 'Vistoria Solicitada'
  // Modo 'todas': Exibe todas as obras
  const { data: obras, isLoading, isFetching, refetch } = useObras(
    activeTab === 'analise'
      ? {
          searchQuery: search,
          allowedStatuses: [
            'Em Análise Técnica',
            'Documentação em Análise',
            'Instalação liberada',
            'Em andamento',
            'Aguardando material',
          ],
          excludeStatus: 'Vistoria Solicitada',
        }
      : { searchQuery: search }
  );

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

      setTimeout(() => {
        setImportDialogOpen(false);
        setFeedback(null);
      }, 2500);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro de conexão ao importar obras.' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Header Fixo */}
      <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 p-4 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-600/30">
              <Sun className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">TORVEN</h1>
              <p className="text-[11px] text-orange-400 font-medium tracking-wider uppercase">Instaladores</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={mounted ? isFetching : false}
            title="Atualizar lista"
            className="rounded-xl border border-zinc-800 bg-zinc-900/60"
          >
            <RefreshCw className={`w-4 h-4 text-zinc-400 ${mounted && isFetching ? 'animate-spin text-orange-400' : ''}`} />
          </Button>
        </div>

        {/* Tabs de Filtro por Status */}
        <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('analise')}
            className={`py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'analise'
                ? 'bg-orange-500 text-white shadow-md font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" /> Em Análise / Campo
          </button>

          <button
            onClick={() => setActiveTab('todas')}
            className={`py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'todas'
                ? 'bg-orange-500 text-white shadow-md font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Todas as Obras
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
          <Input
            type="text"
            placeholder="Buscar por cliente, ID ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800 focus:border-orange-500 text-sm placeholder:text-zinc-500"
          />
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 space-y-3">
        {!mounted || isLoading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
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
                {obras.length} {obras.length === 1 ? 'obra encontrada' : 'obras encontradas'}{' '}
                {activeTab === 'analise' && '(Excluindo Vistoria Solicitada)'}
              </span>
              {search && (
                <button onClick={() => setSearch('')} className="text-orange-400 hover:underline">
                  Limpar busca
                </button>
              )}
            </div>
            {obras.map((obra) => (
              <ObraCard key={obra.id_obra} obra={obra} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
              <Sun className="w-8 h-8 text-zinc-600" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h3 className="text-base font-semibold text-zinc-200">
                {search ? 'Nenhuma obra encontrada' : 'Nenhuma obra nesta visualização'}
              </h3>
              <p className="text-xs text-zinc-400">
                {search
                  ? 'Tente buscar com outros termos de cliente, cidade ou ID.'
                  : activeTab === 'analise'
                  ? "As obras movidas para 'Vistoria Solicitada' são ocultadas desta aba."
                  : 'Importe obras do CRM Groner usando o botão "+" abaixo.'}
              </p>
            </div>
            {!search && (
              <Button onClick={() => setImportDialogOpen(true)} variant="default" size="sm">
                <Plus className="w-4 h-4 mr-1.5" /> Importar Obra(s)
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setImportDialogOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-xl shadow-orange-600/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-150 border border-amber-400/30"
        title="Importar Obra(s) do CRM Groner"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      {/* Modal / Dialog para Importação em Lote */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-400" /> Importar Obra(s) do CRM Groner
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
              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
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
                <div className="text-[11px] pt-1 text-red-300 space-y-0.5 border-t border-red-500/20">
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
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={importMutation.isPending}>
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
