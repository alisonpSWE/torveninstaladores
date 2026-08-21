'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Obra } from '@/lib/supabase/types';
import { PhotoGallery } from './photo-gallery';
import { ObraMateriaisTab } from './obra-materiais-tab';
import { ObraStatusBadge, getStatusBadgeVariant } from './obra-status-badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  PhoneCall,
  MapPin,
  ExternalLink,
  Zap,
  Layers,
  Cpu,
  Home,
  Calendar,
  FileText,
  RefreshCw,
  UserCheck,
  Edit3,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Camera,
  Package,
  Trash2,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
} from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  useObra,
  useSyncObraWithGroner,
  useUpdateObraObservacoes,
  usePerfil,
  useObraImpact,
  useDeleteObra,
} from '@/lib/query/hooks';

interface ObraDetailPageProps {
  idObra?: string | number;
  obra?: Obra;
}

export function ObraDetailPage({ idObra, obra: initialObra }: ObraDetailPageProps) {
  const router = useRouter();
  const targetId = idObra || initialObra?.id_obra || 0;
  const { data: queriedObra, isLoading } = useObra(targetId);
  const { data: perfil } = usePerfil();
  const isAdmin = perfil?.role === 'admin';

  const obra = queriedObra || initialObra;
  const [mainTab, setMainTab] = useState<'fotos' | 'materiais'>('fotos');
  const [isEditingObs, setIsEditingObs] = useState(false);
  const [obsText, setObsText] = useState('');
  const [callConfirmDialogOpen, setCallConfirmDialogOpen] = useState(false);

  // Estados do Modal de Exclusão Definitiva (Admin Only)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmIdInput, setConfirmIdInput] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Hook de Impacto de Exclusão (Fotos e Materiais)
  const { data: impact, isLoading: isLoadingImpact } = useObraImpact(obra?.id_obra, deleteModalOpen);
  const deleteObraMutation = useDeleteObra();

  useEffect(() => {
    if (obra) {
      setObsText(obra.observacoes || '');
    }
  }, [obra]);

  const getWhatsAppUrl = (phone: string | null) => {
    if (!phone || phone === 'Sem telefone') return null;
    const cleanNumber = phone.replace(/\D/g, '');
    if (!cleanNumber) return null;
    const fullNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    const message = `Olá ${obra?.cliente || ''}! Sou da equipe de instalação da Torven energia solar.`;
    return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
  };

  const syncWithGronerMutation = useSyncObraWithGroner();
  const updateObsMutation = useUpdateObraObservacoes();
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handlePanicSync = async () => {
    if (!obra) return;
    setFeedbackBanner(null);
    try {
      await syncWithGronerMutation.mutateAsync(obra.id_obra);
      setFeedbackBanner({ type: 'success', message: 'Sincronização com Groner CRM realizada com sucesso!' });
      setTimeout(() => setFeedbackBanner(null), 4000);
    } catch (err: any) {
      setFeedbackBanner({ type: 'error', message: `Falha ao sincronizar com o Groner CRM: ${err.message}` });
    }
  };

  const handleSaveObs = async () => {
    if (!obra) return;
    try {
      await updateObsMutation.mutateAsync({
        id_obra: obra.id_obra,
        observacoes: obsText.trim() || null,
      });
      setIsEditingObs(false);
      setFeedbackBanner({ type: 'success', message: 'Observações de campo salvas com sucesso!' });
      setTimeout(() => setFeedbackBanner(null), 4000);
    } catch (err: any) {
      setFeedbackBanner({ type: 'error', message: `Erro ao salvar observações: ${err.message}` });
    }
  };

  // Handler: Exclusão Segura da Obra pelo Admin
  const handleDeleteObra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obra) return;
    setDeleteError(null);

    if (confirmIdInput.trim() !== String(obra.id_obra)) {
      setDeleteError(`Digite exatamente o número ${obra.id_obra} para confirmar.`);
      return;
    }

    try {
      await deleteObraMutation.mutateAsync(obra.id_obra);
      setDeleteModalOpen(false);
      // Redireciona para a lista principal
      router.push('/');
    } catch (err: any) {
      setDeleteError(err.message || 'Erro ao excluir obra.');
    }
  };

  if (isLoading || !obra) {
    return (
      <div className="flex flex-col min-h-screen bg-black text-zinc-100 items-center justify-center p-6 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#ffc61e]" />
        <p className="text-xs text-zinc-400 font-semibold">Carregando dados da obra #{targetId}...</p>
      </div>
    );
  }

  const statusVariant = getStatusBadgeVariant(obra.status);
  const statusDotColor =
    statusVariant === 'success'
      ? 'bg-emerald-400'
      : statusVariant === 'warning'
      ? 'bg-amber-400'
      : statusVariant === 'danger'
      ? 'bg-red-400'
      : 'bg-[#ffc61e]';

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-black text-zinc-100">
      {/* Header Fixo de Navegação */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-zinc-800 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white font-bold px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc61e]"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400" />
            <span>Voltar</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* BOTÃO DE PÂNICO: Sincronização Manual com CRM */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePanicSync}
              disabled={syncWithGronerMutation.isPending}
              className="h-10 text-xs border-[#ffc61e]/40 bg-[#ffc61e]/10 text-[#ffc61e] hover:bg-[#ffc61e]/20 px-3.5 font-bold transition-all min-h-[44px]"
              title="Sincronizar manualmente com Groner CRM"
              aria-label="Sincronizar manualmente com Groner CRM"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncWithGronerMutation.isPending ? 'animate-spin text-[#ffc61e]' : ''}`} />
              <span className="hidden sm:inline">
                {syncWithGronerMutation.isPending ? 'Sincronizando...' : 'Sincronizar CRM'}
              </span>
              <span className="sm:hidden">CRM</span>
            </Button>

            {/* BOTÃO DE EXCLUIR OBRA: Apenas para Administradores */}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setConfirmIdInput('');
                  setDeleteError(null);
                  setDeleteModalOpen(true);
                }}
                className="h-10 text-xs border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 px-3 font-bold transition-all min-h-[44px] flex items-center gap-1.5"
                title="Excluir Obra Permanentemente (Admin)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Excluir Obra</span>
              </Button>
            )}

            <span className="font-mono text-xs text-[#ffc61e] bg-[#ffc61e]/15 px-2.5 py-1.5 rounded-xl border border-[#ffc61e]/30 font-bold">
              #{obra.id_obra}
            </span>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto w-full space-y-4">
        {/* Banner do Cliente & Status */}
        <div className="space-y-3 bg-zinc-900/90 p-4 sm:p-5 rounded-2xl border border-zinc-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold text-[#ffc61e] tracking-wider">Obra / Cliente</span>
            <ObraStatusBadge status={obra.status} />
          </div>

          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight">{obra.cliente}</h1>
            <button
              onClick={handlePanicSync}
              disabled={syncWithGronerMutation.isPending}
              className="p-2 text-zinc-400 hover:text-[#ffc61e] hover:bg-zinc-800 rounded-xl transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Forçar atualização dos dados da obra"
              aria-label="Forçar atualização dos dados da obra"
            >
              <RefreshCw className={`w-4 h-4 ${syncWithGronerMutation.isPending ? 'animate-spin text-[#ffc61e]' : ''}`} />
            </button>
          </div>

          {/* Status Detalhado */}
          <div className="space-y-1.5 pt-1">
            <span className="text-xs text-zinc-400 font-semibold block">
              Status no CRM Groner:
            </span>
            <div className="inline-flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded-xl text-xs font-bold text-zinc-100 w-full">
              <span className={`w-2.5 h-2.5 rounded-full ${statusDotColor} animate-pulse shrink-0`}></span>
              <span className="truncate">{obra.status}</span>
            </div>
          </div>

          {/* Localização com Botão Maps */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
            <div className="space-y-0.5">
              <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#ffc61e] shrink-0" />
                <span>{obra.endereco}</span>
              </span>
              <span className="text-xs text-zinc-500 font-medium pl-5 block">
                {obra.cidade}
              </span>
            </div>

            {obra.link_maps && obra.link_maps !== 'Coordenadas ausentes' && (
              <a
                href={obra.link_maps}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 text-xs text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-3.5 py-2 rounded-xl transition-colors shrink-0 font-bold border border-zinc-700/60 min-h-[44px]"
              >
                <span>Ver no Maps</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#ffc61e]" />
              </a>
            )}
          </div>

          {/* Contato do Cliente: Telefone + WhatsApp */}
          <div className="pt-2 border-t border-zinc-800/80 space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
              Contato do Cliente
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {obra.telefone && obra.telefone !== 'Sem telefone' ? (
                <>
                  <Button
                    type="button"
                    onClick={() => setCallConfirmDialogOpen(true)}
                    className="flex-1 min-w-[140px] bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs h-11 rounded-xl shadow-sm flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Ligar ({obra.telefone})</span>
                  </Button>

                  {getWhatsAppUrl(obra.telefone) && (
                    <a
                      href={getWhatsAppUrl(obra.telefone)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-[140px] bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs h-11 rounded-xl shadow-sm flex items-center justify-center gap-2 min-h-[44px] transition-colors"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </>
              ) : (
                <span className="text-xs text-zinc-500 italic">Telefone não cadastrado no CRM.</span>
              )}
            </div>
          </div>

          {/* Vendedor Responsável no CRM */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
            <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#ffc61e]" /> Vendedor:
            </span>
            <span className="font-bold text-zinc-100 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
              {obra.instalador || 'Não informado'}
            </span>
          </div>
        </div>

        {/* BLOCO 2: Especificações de Engenharia */}
        <section className="space-y-2.5">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2 px-0.5">
            <Zap className="w-4 h-4 text-[#ffc61e]" /> Especificações de Engenharia
          </h2>

          <Card className="p-4 sm:p-5 border-zinc-800 bg-zinc-900/90 space-y-4 shadow-md">
            {/* Potência Total & Rede / Ligação */}
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-zinc-800">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-bold uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5 text-[#ffc61e]" /> Potência Total
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#ffc61e] font-mono">
                  {obra.potencia_total_kwp ? obra.potencia_total_kwp.toFixed(2) : '0'} <span className="text-xs font-bold text-zinc-400">kWp</span>
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-bold uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" /> Rede / Ligação
                </div>
                <p className="text-base font-bold text-white pt-1">
                  {obra.tipo_ligacao || 'Não definida'}
                </p>
              </div>
            </div>

            {/* Inversor Solar */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                <Cpu className="w-4 h-4 text-[#ffc61e]" /> Inversor Solar
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-xs bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/90">
                <div>
                  <span className="text-zinc-400 block font-medium">Marca</span>
                  <span className="font-semibold text-zinc-200">{obra.inversor_marca || '—'}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-medium">Potência Inversor</span>
                  <span className="font-semibold text-zinc-200">{obra.potencia_inversor_kw ? `${obra.potencia_inversor_kw} kW` : '—'}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-zinc-800/60">
                  <span className="text-zinc-400 block font-medium">Modelo</span>
                  <span className="font-semibold text-zinc-200 break-words font-mono">{obra.inversor_modelo || '—'}</span>
                </div>
              </div>
            </div>

            {/* Módulos Fotovoltaicos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-300 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-[#ffc61e]" /> Módulos Fotovoltaicos
                </div>
                <span className="text-[#ffc61e] font-mono font-bold bg-[#ffc61e]/15 px-2.5 py-0.5 rounded-md border border-[#ffc61e]/30">
                  {obra.qtd_modulos} placas
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-xs bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/90">
                <div>
                  <span className="text-zinc-400 block font-medium">Marca Placa</span>
                  <span className="font-semibold text-zinc-200">{obra.modulos_marca || '—'}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-medium">Potência Unitária</span>
                  <span className="font-semibold text-zinc-200">{obra.potencia_modulo_w ? `${obra.potencia_modulo_w} W` : '—'}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-zinc-800/60">
                  <span className="text-zinc-400 block font-medium">Modelo Placa</span>
                  <span className="font-semibold text-zinc-200 break-words font-mono">{obra.modulos_modelo || '—'}</span>
                </div>
              </div>
            </div>

            {/* Telhado e Data */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800 text-xs">
              <div className="space-y-0.5">
                <span className="text-zinc-400 flex items-center gap-1 font-medium">
                  <Home className="w-3.5 h-3.5 text-zinc-400" /> Tipo Telhado
                </span>
                <span className="font-semibold text-zinc-200 block">{obra.tipo_telhado || '—'}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-zinc-400 flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Data Status
                </span>
                <span className="font-semibold text-zinc-200 block">{obra.data_instalacao || '—'}</span>
              </div>
            </div>
          </Card>
        </section>

        {/* NAVEGAÇÃO ENTRE ABAS: [📸 Fotos da Obra] vs [📦 Materiais / Estoque] */}
        <section className="space-y-4" aria-label="Seções operacionais da obra">
          <div
            role="tablist"
            aria-label="Alternar entre fotos e materiais consumidos"
            className="flex items-center gap-1.5 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800 text-xs font-bold shadow-inner"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mainTab === 'fotos'}
              onClick={() => setMainTab('fotos')}
              className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                mainTab === 'fotos'
                  ? 'bg-[#ffc61e] text-black shadow-md font-extrabold scale-[1.01]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Fotos da Obra</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={mainTab === 'materiais'}
              onClick={() => setMainTab('materiais')}
              className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                mainTab === 'materiais'
                  ? 'bg-[#ffc61e] text-black shadow-md font-extrabold scale-[1.01]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Materiais / Estoque</span>
            </button>
          </div>

          {/* Feedback Banner Inline */}
          {feedbackBanner && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
                feedbackBanner.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedbackBanner.message}</span>
            </div>
          )}

          {/* Manter abas montadas em memória para NUNCA perder rascunho de materiais */}
          <div className={mainTab === 'fotos' ? 'block' : 'hidden'}>
            <PhotoGallery obraId={obra.id_obra} />
          </div>

          <div className={mainTab === 'materiais' ? 'block' : 'hidden'}>
            <ObraMateriaisTab idObra={obra.id_obra} obra={obra} />
          </div>

          {/* Observações Editáveis */}
          <Card className="p-4 sm:p-5 border-zinc-800 bg-zinc-900/90 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#ffc61e]" /> Observações de Campo
              </span>

              {!isEditingObs ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingObs(true)}
                  className="h-9 px-3 text-xs text-[#ffc61e] hover:text-[#e5b010] hover:bg-zinc-800 font-bold min-h-[44px]"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Editar
                </Button>
              ) : null}
            </div>

            {isEditingObs ? (
              <div className="space-y-3">
                <textarea
                  value={obsText}
                  onChange={(e) => setObsText(e.target.value)}
                  rows={4}
                  placeholder="Escreva anotações sobre o andamento da instalação..."
                  className="w-full bg-zinc-950 border border-zinc-700 text-xs sm:text-sm text-zinc-100 rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-[#ffc61e]"
                />
                <div className="flex justify-end gap-2.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingObs(false)}
                    disabled={updateObsMutation.isPending}
                    className="h-10 text-xs min-h-[48px] px-4 font-semibold"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveObs}
                    disabled={updateObsMutation.isPending}
                    className="h-10 text-xs min-h-[48px] px-5 bg-[#ffc61e] text-black hover:bg-[#e5b010] font-extrabold"
                  >
                    {updateObsMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    )}
                    Salvar Observações
                  </Button>
                </div>
              </div>
            ) : (
              <div className="max-w-[65ch]">
                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/90 font-normal">
                  {obra.observacoes || 'Nenhuma observação registrada.'}
                </p>
              </div>
            )}
          </Card>
        </section>
      </main>

      {/* Modal de Confirmação para Ligação Direta */}
      <Dialog open={callConfirmDialogOpen} onOpenChange={setCallConfirmDialogOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-400 text-base font-bold">
            <PhoneCall className="w-5 h-5" /> Confirmar Ligação
          </DialogTitle>
          <DialogDescription className="text-zinc-300 text-xs pt-1 leading-relaxed">
            Deseja realizar a chamada telefônica para <strong className="text-white">{obra.cliente}</strong> no número <span className="font-mono text-emerald-400 font-bold">{obra.telefone}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-end gap-2.5 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCallConfirmDialogOpen(false)}
            className="min-h-[48px] px-4"
          >
            Cancelar
          </Button>
          {obra.telefone && (
            <a href={`tel:${obra.telefone.replace(/\D/g, '')}`} onClick={() => setCallConfirmDialogOpen(false)}>
              <Button type="button" className="bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold min-h-[48px] px-5">
                <PhoneCall className="w-4 h-4 mr-1.5" /> Confirmar e Ligar
              </Button>
            </a>
          )}
        </div>
      </Dialog>

      {/* Modal de Exclusão Definitiva da Obra (Admin Only) */}
      {isAdmin && (
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-1 shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <DialogTitle className="text-white text-base sm:text-lg font-bold flex items-center gap-2">
              <span>Excluir Obra #{obra.id_obra} Permanentemente</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs pt-1 leading-relaxed">
              Esta ação removerá todos os dados desta obra do aplicativo e do banco de dados na nuvem.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDeleteObra} className="space-y-4 mt-2">
            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Painel de Impacto */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5 text-xs text-zinc-300">
              <span className="font-bold text-white uppercase tracking-wider text-xs block">
                Impacto da Exclusão:
              </span>

              {isLoadingImpact ? (
                <div className="flex items-center gap-2 text-zinc-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#ffc61e]" />
                  <span>Calculando registros vinculados...</span>
                </div>
              ) : (
                <ul className="space-y-1.5 text-zinc-300 text-xs">
                  <li className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#ffc61e] shrink-0" />
                    <span>
                      <strong className="text-white">{impact?.photoCount || 0} foto(s)</strong> serão apagadas permanentemente do armazenamento.
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong className="text-white">{impact?.materialCount || 0} registro(s)</strong> de consumo de materiais serão removidos.
                    </span>
                  </li>
                </ul>
              )}

              {/* Alerta de Retorno ao Estoque */}
              {(impact?.totalQuantidadeMateriais || 0) > 0 && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold leading-relaxed mt-2 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    ⚠️ Os <strong className="text-white">{impact?.totalQuantidadeMateriais} materiais</strong> registrados nesta obra retornarão automaticamente ao saldo do estoque central.
                  </span>
                </div>
              )}

              {/* Informação sobre Reimportação */}
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 leading-relaxed mt-1">
                💡 <strong>Dica:</strong> Se você quiser trazer esta obra de volta no futuro, basta importá-la novamente digitando o ID <strong className="text-[#ffc61e]">#{obra.id_obra}</strong> na tela inicial.
              </div>
            </div>

            {/* Input de Confirmação por ID */}
            <div className="space-y-1.5">
              <label htmlFor="confirm-obra-id" className="text-xs font-bold text-zinc-200 block">
                Para confirmar a exclusão, digite o ID da obra (<span className="text-[#ffc61e] font-mono">{obra.id_obra}</span>):
              </label>
              <Input
                id="confirm-obra-id"
                type="text"
                value={confirmIdInput}
                onChange={(e) => setConfirmIdInput(e.target.value)}
                placeholder={`Digite ${obra.id_obra}`}
                disabled={deleteObraMutation.isPending}
                className="bg-zinc-950 border-zinc-700 text-white font-mono text-sm focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteObraMutation.isPending}
                className="min-h-[44px]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  confirmIdInput.trim() !== String(obra.id_obra) ||
                  deleteObraMutation.isPending
                }
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs min-h-[44px] px-5 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                {deleteObraMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir Obra Definitivamente</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
