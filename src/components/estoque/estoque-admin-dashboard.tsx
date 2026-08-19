'use client';

import React, { useState, useMemo, useEffect, useRef, useDeferredValue } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  useEstoqueProdutos,
  useCreateEstoqueProduto,
  useUpdateEstoqueSaldo,
} from '@/lib/query/hooks';
import { EstoqueProduto } from '@/lib/supabase/types';
import { EstoqueDataTable } from './estoque-data-table';
import { EstoqueGridView } from './estoque-grid-view';
import { BulkActionsBar } from './bulk-actions-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Package,
  Search,
  Plus,
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  Layers,
  Edit,
  TrendingDown,
  Shield,
  Loader2,
  FileSpreadsheet,
  Download,
  Table as TableIcon,
  LayoutGrid,
  AlertOctagon,
  CheckCircle2,
  RotateCcw,
  X,
  ShoppingCart,
} from 'lucide-react';

// Code-split heavy modals for optimal initial page bundle & execution
const BulkCategoriaModal = dynamic(
  () => import('./bulk-categoria-modal').then((mod) => mod.BulkCategoriaModal),
  { ssr: false }
);
const KardexModal = dynamic(
  () => import('./kardex-modal').then((mod) => mod.KardexModal),
  { ssr: false }
);
const ImportCsvModal = dynamic(
  () => import('./import-csv-modal').then((mod) => mod.ImportCsvModal),
  { ssr: false }
);
const CriticalPurchaseModal = dynamic(
  () => import('./critical-purchase-modal').then((mod) => mod.CriticalPurchaseModal),
  { ssr: false }
);

export function EstoqueAdminDashboard() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [onlyCritical, setOnlyCritical] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modais
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
  const [criticalPurchaseOpen, setCriticalPurchaseOpen] = useState(false);
  const [kardexProduct, setKardexProduct] = useState<EstoqueProduto | null>(null);
  const [targetProduct, setTargetProduct] = useState<EstoqueProduto | null>(null);

  // Form states - Novo Produto
  const [novoCodigo, setNovoCodigo] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('Fixação');
  const [customNovaCategoria, setCustomNovaCategoria] = useState('');
  const [novaUnidade, setNovaUnidade] = useState('un');
  const [novoSaldo, setNovoSaldo] = useState('0');
  const [novoMinimo, setNovoMinimo] = useState('10');
  const [novaLocalizacao, setNovaLocalizacao] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Form states - Ajuste de Saldo
  const [ajusteNovoSaldo, setAjusteNovoSaldo] = useState('');
  const [ajusteNovoMinimo, setAjusteNovoMinimo] = useState('');
  const [ajusteNovaLocalizacao, setAjusteNovaLocalizacao] = useState('');
  const [ajusteJustificativa, setAjusteJustificativa] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Toast System com Suporte a Undo
  const [toastInfo, setToastInfo] = useState<{
    message: string;
    undoFn?: () => Promise<void>;
    id: number;
    isUndoing?: boolean;
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Queries e Mutations
  const {
    data: produtos = [],
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useEstoqueProdutos();

  const createMutation = useCreateEstoqueProduto();
  const updateSaldoMutation = useUpdateEstoqueSaldo();

  const showToast = (message: string, undoFn?: () => Promise<void>) => {
    setToastInfo({ message, undoFn, id: Date.now() });
  };

  const handleExecuteUndo = async () => {
    if (!toastInfo?.undoFn) return;
    setToastInfo((prev) => (prev ? { ...prev, isUndoing: true } : null));
    try {
      await toastInfo.undoFn();
      setToastInfo({
        message: 'Ajuste desfeito com sucesso!',
        id: Date.now(),
      });
    } catch (err: any) {
      setToastInfo({
        message: `Falha ao desfazer: ${err.message || 'Erro inesperado'}`,
        id: Date.now(),
      });
    }
  };

  useEffect(() => {
    if (!toastInfo) return;
    const timer = setTimeout(() => {
      setToastInfo(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toastInfo]);

  // Atalhos de Teclado (Keybindings rápidos)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      if (e.key === 'Escape') {
        if (selectedIds.length > 0) {
          setSelectedIds([]);
        } else if (search) {
          setSearch('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, search]);

  // Métricas do Estoque (KPIs no topo)
  const metrics = useMemo(() => {
    const totalSKUs = produtos.length;
    const criticalItems = produtos.filter(
      (p) => Number(p.quantidade_saldo) <= Number(p.estoque_minimo)
    );
    const totalUnits = produtos.reduce((acc, p) => acc + Number(p.quantidade_saldo || 0), 0);

    return {
      totalSKUs,
      criticalCount: criticalItems.length,
      totalUnits,
    };
  }, [produtos]);

  // Categorias únicas
  const categories = useMemo(() => {
    const set = new Set<string>();
    produtos.forEach((p) => {
      if (p.categoria) set.add(p.categoria);
    });
    return ['Todos', ...Array.from(set)];
  }, [produtos]);

  // Lista de categorias para formulário de cadastro
  const availableFormCategories = useMemo(() => {
    const set = new Set([
      ...categories.filter((c) => c !== 'Todos'),
      'Fixação',
      'Cabos',
      'Conectores',
      'Caixas',
      'Acessórios',
      'Inversores',
      'Módulos',
      'Outros',
    ]);
    return Array.from(set).filter(Boolean);
  }, [categories]);

  // Search diferido para performance responsiva durante digitação rápida
  const deferredSearch = useDeferredValue(search);

  // Produtos filtrados com busca otimizada
  const filteredProdutos = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    return produtos.filter((p) => {
      const matchesCategory = selectedCategory === 'Todos' || p.categoria === selectedCategory;
      const matchesSearch =
        !q ||
        p.nome.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        (p.localizacao && p.localizacao.toLowerCase().includes(q));
      const isCritical = Number(p.quantidade_saldo) <= Number(p.estoque_minimo);
      const matchesCritical = !onlyCritical || isCritical;
      return matchesCategory && matchesSearch && matchesCritical;
    });
  }, [produtos, selectedCategory, deferredSearch, onlyCritical]);

  // Itens atualmente selecionados
  const selectedItems = useMemo(() => {
    const set = new Set(selectedIds);
    return produtos.filter((p) => set.has(p.id));
  }, [produtos, selectedIds]);

  // Seleção individual / alternada
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Selecionar todos os visíveis
  const handleSelectAll = () => {
    if (selectedIds.length === filteredProdutos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProdutos.map((p) => p.id));
    }
  };

  // Exportar Catálogo Completo para CSV (Ação rápida para Alex/Power User)
  const handleExportFullCatalog = () => {
    if (produtos.length === 0) {
      showToast('Nenhum produto cadastrado para exportar.');
      return;
    }
    const headers = ['Código SKU', 'Descrição', 'Categoria', 'Unidade', 'Saldo Atual', 'Estoque Mínimo', 'Endereçamento'];
    const rows = produtos.map((item) => [
      item.codigo,
      `"${item.nome.replace(/"/g, '""')}"`,
      item.categoria,
      item.unidade,
      item.quantidade_saldo,
      item.estoque_minimo,
      `"${(item.localizacao || 'Almoxarifado Geral').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `catalogo_completo_estoque_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Catálogo completo exportado com sucesso em CSV!');
  };

  // Handler: Criar Produto
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const finalCategoria = novaCategoria === '__nova__' ? customNovaCategoria.trim() : novaCategoria.trim();

    if (!novoCodigo.trim() || !novoNome.trim()) {
      setCreateError('Informe o código e o nome do produto.');
      return;
    }

    if (!finalCategoria) {
      setCreateError('Informe uma categoria válida.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        codigo: novoCodigo.trim().toUpperCase(),
        nome: novoNome.trim(),
        categoria: finalCategoria || 'Geral',
        unidade: novaUnidade.trim() || 'un',
        quantidade_saldo: parseFloat(novoSaldo) || 0,
        estoque_minimo: parseFloat(novoMinimo) || 0,
        localizacao: novaLocalizacao.trim() || 'Almoxarifado Geral',
      });

      setCreateDialogOpen(false);
      setNovoCodigo('');
      setNovoNome('');
      setNovoSaldo('0');
      setNovoMinimo('10');
      setNovaLocalizacao('');
      setCustomNovaCategoria('');
      showToast(`Produto "${novoNome.trim()}" cadastrado com sucesso!`);
    } catch (err: any) {
      setCreateError(err.message || 'Erro ao cadastrar produto.');
    }
  };

  // Handler: Abrir Modal de Ajuste
  const openAdjustDialog = (prod: EstoqueProduto) => {
    setTargetProduct(prod);
    setAjusteNovoSaldo(String(prod.quantidade_saldo));
    setAjusteNovoMinimo(String(prod.estoque_minimo));
    setAjusteNovaLocalizacao(prod.localizacao || 'Almoxarifado Geral');
    setAjusteJustificativa('');
    setAdjustError(null);
    setAdjustDialogOpen(true);
  };

  // Handler: Salvar Ajuste
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProduct) return;
    setAdjustError(null);

    if (!ajusteJustificativa.trim()) {
      setAdjustError('A justificativa do ajuste é obrigatória (ex: Entrada de NF #450, Inventário).');
      return;
    }

    const novoSaldoNum = parseFloat(ajusteNovoSaldo);
    const novoMinimoNum = parseFloat(ajusteNovoMinimo);

    if (isNaN(novoSaldoNum)) {
      setAdjustError('Informe um valor de saldo válido.');
      return;
    }

    try {
      await updateSaldoMutation.mutateAsync({
        id: targetProduct.id,
        quantidade_saldo: novoSaldoNum,
        estoque_minimo: isNaN(novoMinimoNum) ? undefined : novoMinimoNum,
        localizacao: ajusteNovaLocalizacao.trim() || 'Almoxarifado Geral',
      });

      setAdjustDialogOpen(false);
      const prodName = targetProduct.nome;
      setTargetProduct(null);
      showToast(`Parâmetros de "${prodName}" atualizados com sucesso!`);
    } catch (err: any) {
      setAdjustError(err.message || 'Erro ao ajustar saldo.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-28 bg-black text-zinc-100 relative">
      {/* Header Fixo de Navegação e Ações Globais */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-zinc-800 p-4 shadow-lg">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white font-bold px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 transition-colors min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-400" />
              <span>Voltar</span>
            </Link>

            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#ffc61e] flex items-center justify-center border border-[#ffc61e]/40 shadow-sm text-black shrink-0">
                <Package className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-white leading-tight">
                    Gestão de Estoque & Inventário
                  </h1>
                  <span className="text-xs font-mono font-extrabold uppercase bg-[#ffc61e]/20 text-[#ffc61e] border border-[#ffc61e]/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3" /> WMS ADMIN
                  </span>
                </div>
                <p className="text-xs text-zinc-400">Almoxarifado central e consumo de materiais</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Atualizar dados de estoque"
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 min-h-[44px] min-w-[44px]"
            >
              <RefreshCw className={`w-4 h-4 text-zinc-400 ${isFetching ? 'animate-spin text-[#ffc61e]' : ''}`} />
            </Button>

            {/* Exportar Catálogo CSV */}
            <Button
              variant="outline"
              onClick={handleExportFullCatalog}
              title="Exportar catálogo completo para planilha CSV"
              className="h-10 border-zinc-700 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white font-bold text-xs rounded-xl min-h-[44px] px-3.5 hidden md:flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-[#ffc61e]" />
              <span>Exportar CSV</span>
            </Button>

            {/* Importar CSV */}
            <Button
              variant="outline"
              onClick={() => setCsvModalOpen(true)}
              className="h-10 border-zinc-700 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white font-bold text-xs rounded-xl min-h-[44px] px-3.5 flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#ffc61e]" />
              <span className="hidden sm:inline">Importar CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>

            {/* Cadastrar Produto (Ação Primária Amarela) */}
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="h-10 bg-[#ffc61e] hover:bg-[#e5b010] text-black font-extrabold text-xs rounded-xl shadow-md min-h-[44px] px-4 flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Cadastrar Produto</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="p-4 max-w-7xl mx-auto w-full space-y-5">
        {/* Cards de Métricas Principais (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Card className="p-4 bg-zinc-900/90 border-zinc-800 space-y-1 shadow-md">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold">
              <span>Catálogo Ativo (SKUs)</span>
              <Layers className="w-4 h-4 text-[#ffc61e]" />
            </div>
            <p className="text-2xl font-black text-white font-mono tabular-nums">{metrics.totalSKUs}</p>
            <span className="text-xs text-zinc-400 block">Itens cadastrados no sistema</span>
          </Card>

          <Card className="p-4 bg-zinc-900/90 border-zinc-800 space-y-2 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
              <span>Estoque Crítico / Baixo</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <p className={`text-2xl font-black font-mono tabular-nums ${metrics.criticalCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {metrics.criticalCount}
              </p>
              {metrics.criticalCount > 0 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setCriticalPurchaseOpen(true)}
                  className="h-8 text-xs bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg px-2.5 flex items-center gap-1 shadow-sm transition-all active:scale-95"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Gerar Pedido</span>
                </Button>
              )}
            </div>
            <span className="text-xs text-zinc-400 block">Itens com saldo ≤ estoque mínimo</span>
          </Card>

          <Card className="p-4 bg-zinc-900/90 border-zinc-800 space-y-1 shadow-md">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold">
              <span>Volume Total em Almoxarifado</span>
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400 font-mono tabular-nums">
              {metrics.totalUnits.toLocaleString('pt-BR')}
            </p>
            <span className="text-xs text-zinc-400 block">Unidades consolidadas em estoque</span>
          </Card>
        </div>

        {/* Barra de Ferramentas de Alta Densidade: Busca, Filtros e Alternador de Visão */}
        <div className="space-y-3 bg-zinc-950 p-3.5 sm:p-4 rounded-2xl border border-zinc-800 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Input de Busca com atalho '/' */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por código (C-014), nome ou localização..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-12 bg-zinc-900 border-zinc-800 text-xs text-white placeholder:text-zinc-500 rounded-xl min-h-[44px] focus:ring-2 focus:ring-[#ffc61e]"
              />
              <span className="absolute right-3 top-3 text-xs font-mono font-bold text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 pointer-events-none hidden sm:inline-block">
                /
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              {/* Filtro Crítico */}
              <button
                type="button"
                onClick={() => setOnlyCritical(!onlyCritical)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 border ${
                  onlyCritical
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                }`}
              >
                <TrendingDown className="w-4 h-4 text-amber-400" />
                <span>Estoque Baixo</span>
              </button>

              {/* Alternador de Visualização (Table vs Grid) */}
              <div
                role="group"
                aria-label="Alternar modo de visualização"
                className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs shrink-0"
              >
                <button
                  type="button"
                  aria-label="Visualização em Tabela Operacional"
                  aria-pressed={viewMode === 'table'}
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition-all min-h-[36px] min-w-[36px] flex items-center justify-center gap-1.5 ${
                    viewMode === 'table'
                      ? 'bg-zinc-800 text-white font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Tabela de Dados (Alta Densidade)"
                >
                  <TableIcon className="w-4 h-4" />
                  <span className="hidden md:inline text-xs">Tabela</span>
                </button>

                <button
                  type="button"
                  aria-label="Visualização em Cards"
                  aria-pressed={viewMode === 'grid'}
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all min-h-[36px] min-w-[36px] flex items-center justify-center gap-1.5 ${
                    viewMode === 'grid'
                      ? 'bg-zinc-800 text-white font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Grade de Cards"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden md:inline text-xs">Cards</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pílulas de Categoria com Touch Targets Amplos */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1 border-t border-zinc-850">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[38px] flex items-center justify-center ${
                  selectedCategory === cat
                    ? 'bg-[#ffc61e] text-black shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela ou Grade de Produtos com Altura Mínima Estável */}
        <div className="min-h-[480px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#ffc61e]" />
              <p className="text-xs text-zinc-400 font-semibold">Carregando catálogo de materiais...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-16 bg-rose-950/20 rounded-2xl border border-rose-800/50 p-6 space-y-3">
              <AlertOctagon className="w-10 h-10 text-rose-500 mx-auto" />
              <h3 className="text-sm font-bold text-rose-200">Falha ao carregar o catálogo de estoque</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                {(error as Error)?.message || 'Erro de conexão com o banco de dados. Verifique sua rede e tente novamente.'}
              </p>
              <Button
                type="button"
                onClick={() => refetch()}
                className="h-9 bg-[#ffc61e] hover:bg-[#e5b010] text-black font-extrabold text-xs rounded-xl px-4 inline-flex items-center gap-1.5 shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tentar Novamente</span>
              </Button>
            </div>
          ) : filteredProdutos.length === 0 ? (
            <div className="text-center py-16 bg-zinc-950/40 rounded-2xl border border-dashed border-zinc-800 p-6 space-y-2">
              <Package className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-300">Nenhum material encontrado</h3>
              <p className="text-xs text-zinc-500">Tente ajustar seus termos de busca ou filtros de categoria.</p>
            </div>
          ) : viewMode === 'table' ? (
            <EstoqueDataTable
              produtos={filteredProdutos}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              onOpenKardex={(prod) => setKardexProduct(prod)}
              onOpenAdjust={openAdjustDialog}
              onToast={showToast}
            />
          ) : (
            <EstoqueGridView
              produtos={filteredProdutos}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onOpenKardex={(prod) => setKardexProduct(prod)}
              onOpenAdjust={openAdjustDialog}
              onToast={showToast}
            />
          )}
        </div>
      </main>

      {/* Barra Flutuante de Ações em Lote (Bulk Actions) */}
      <BulkActionsBar
        selectedItems={selectedItems}
        onClearSelection={() => setSelectedIds([])}
        onOpenBulkCategory={() => setBulkCategoryOpen(true)}
      />

      {/* Modal: Ficha Kardex de Movimentação */}
      <KardexModal
        produto={kardexProduct}
        open={!!kardexProduct}
        onOpenChange={(open) => !open && setKardexProduct(null)}
      />

      {/* Modal: Ajuste de Categoria em Lote */}
      <BulkCategoriaModal
        open={bulkCategoryOpen}
        onOpenChange={setBulkCategoryOpen}
        selectedItems={selectedItems}
        availableCategories={categories}
        onSuccess={() => {
          setSelectedIds([]);
          refetch();
          showToast('Categorias atualizadas em lote com sucesso!');
        }}
      />

      {/* Modal: Pedido de Compra de Reposição Crítica */}
      <CriticalPurchaseModal
        open={criticalPurchaseOpen}
        onOpenChange={setCriticalPurchaseOpen}
        produtos={produtos}
      />

      {/* Modal: Cadastro de Novo Produto */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Plus className="w-5 h-5 text-[#ffc61e]" />
            <span>Cadastrar Novo Produto</span>
          </DialogTitle>
          <DialogDescription>
            Adicione um novo item ao catálogo do almoxarifado com código único e endereçamento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateProduct} className="space-y-4 mt-3">
          {createError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Código / SKU</label>
              <Input
                type="text"
                placeholder="Ex: C-021"
                value={novoCodigo}
                onChange={(e) => setNovoCodigo(e.target.value)}
                required
                className="bg-zinc-950 border-zinc-800 text-xs text-white font-mono uppercase min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Unidade de Medida</label>
              <select
                value={novaUnidade}
                onChange={(e) => setNovaUnidade(e.target.value)}
                className="w-full h-11 rounded-xl bg-zinc-950 border border-zinc-800 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#ffc61e]"
              >
                <option value="un">un (Unidade)</option>
                <option value="m">m (Metro)</option>
                <option value="par">par (Par)</option>
                <option value="barra">barra (Barra)</option>
                <option value="rolo">rolo (Rolo)</option>
                <option value="kit">kit (Kit)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-300">Descrição do Produto</label>
            <Input
              type="text"
              placeholder="Ex: Cabo Solar 10mm² Preto"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              required
              className="bg-zinc-950 border-zinc-800 text-xs text-white min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Categoria</label>
              <select
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                className="w-full h-11 rounded-xl bg-zinc-950 border border-zinc-800 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#ffc61e]"
              >
                {availableFormCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__nova__">+ Cadastrar Nova Categoria...</option>
              </select>

              {novaCategoria === '__nova__' && (
                <div className="pt-1.5">
                  <Input
                    type="text"
                    autoFocus
                    placeholder="Nome da categoria (ex: Ferramentas)"
                    value={customNovaCategoria}
                    onChange={(e) => setCustomNovaCategoria(e.target.value)}
                    className="bg-zinc-950 border-zinc-700 text-xs text-white rounded-xl min-h-[40px]"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Endereçamento Físico</label>
              <Input
                type="text"
                placeholder="Ex: Corredor B - Prateleira 03"
                value={novaLocalizacao}
                onChange={(e) => setNovaLocalizacao(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-xs text-white min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Saldo Inicial</label>
              <Input
                type="number"
                step="any"
                value={novoSaldo}
                onChange={(e) => setNovoSaldo(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-xs text-white font-mono min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Estoque Mínimo</label>
              <Input
                type="number"
                step="any"
                value={novoMinimo}
                onChange={(e) => setNovoMinimo(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-xs text-white font-mono min-h-[44px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateDialogOpen(false)}
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-[#ffc61e] text-black hover:bg-[#e5b010] font-extrabold min-h-[44px] px-5"
            >
              {createMutation.isPending ? 'Salvando...' : 'Salvar Produto'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Ajuste Manual de Saldo e Endereçamento */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Edit className="w-5 h-5 text-[#ffc61e]" />
            <span>Ajuste de Estoque & Parâmetros</span>
          </DialogTitle>
          <DialogDescription>
            {targetProduct ? `${targetProduct.codigo} — ${targetProduct.nome}` : 'Ajuste manual de saldo'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveAdjustment} className="space-y-4 mt-3">
          {adjustError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
              {adjustError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">
                Novo Saldo ({targetProduct?.unidade})
              </label>
              <Input
                type="number"
                step="any"
                value={ajusteNovoSaldo}
                onChange={(e) => setAjusteNovoSaldo(e.target.value)}
                required
                className="bg-zinc-950 border-zinc-800 text-xs text-white font-mono font-bold min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">
                Estoque Mínimo ({targetProduct?.unidade})
              </label>
              <Input
                type="number"
                step="any"
                value={ajusteNovoMinimo}
                onChange={(e) => setAjusteNovoMinimo(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-xs text-white font-mono min-h-[44px]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-300">Endereçamento Físico</label>
            <Input
              type="text"
              placeholder="Ex: Corredor B - Prateleira 03"
              value={ajusteNovaLocalizacao}
              onChange={(e) => setAjusteNovaLocalizacao(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-xs text-white min-h-[44px]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-300">
              Justificativa Obrigatória do Ajuste
            </label>
            <Input
              type="text"
              placeholder="Ex: Entrada de NF #4590, Contagem física de inventário..."
              value={ajusteJustificativa}
              onChange={(e) => setAjusteJustificativa(e.target.value)}
              required
              className="bg-zinc-950 border-zinc-800 text-xs text-white placeholder:text-zinc-600 min-h-[44px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAdjustDialogOpen(false)}
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateSaldoMutation.isPending}
              className="bg-[#ffc61e] text-black hover:bg-[#e5b010] font-extrabold min-h-[44px] px-5"
            >
              {updateSaldoMutation.isPending ? 'Gravando...' : 'Confirmar Ajuste'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Importação de Catálogo via Planilha CSV */}
      <ImportCsvModal
        open={csvModalOpen}
        onOpenChange={setCsvModalOpen}
        onSuccess={() => {
          refetch();
          showToast('Importação de CSV concluída com sucesso!');
        }}
      />

      {/* Toast Flutuante Não-Bloqueante com Suporte a Desfazer (Undo) */}
      {toastInfo && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 sm:top-auto sm:bottom-6 right-4 sm:right-6 z-50 max-w-md w-[calc(100%-2rem)] sm:w-auto bg-zinc-900/95 border border-zinc-700/90 text-white rounded-2xl shadow-2xl p-3.5 backdrop-blur-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 sm:slide-in-from-bottom-5 duration-200"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-zinc-200 truncate leading-snug">
              {toastInfo.message}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {toastInfo.undoFn && (
              <button
                type="button"
                onClick={handleExecuteUndo}
                disabled={toastInfo.isUndoing}
                className="px-2.5 py-1 text-xs font-black bg-[#ffc61e] text-black hover:bg-[#e5b010] rounded-lg transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50 min-h-[32px]"
              >
                <RotateCcw className={`w-3 h-3 ${toastInfo.isUndoing ? 'animate-spin' : ''}`} />
                <span>Desfazer</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setToastInfo(null)}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              aria-label="Fechar notificação"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
