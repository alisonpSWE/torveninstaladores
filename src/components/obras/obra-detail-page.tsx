'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Obra } from '@/lib/supabase/types';
import { PhotoCapture } from './photo-capture';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Folder,
  FileText,
  RefreshCw,
  UserCheck,
  Edit3,
  CheckCircle2,
  Loader2,
  Link as LinkIcon,
} from 'lucide-react';
import { useObra, useSyncObraWithGroner, useUpdateObraStatus, useUpdateObraDriveLink, useUpdateObraObservacoes } from '@/lib/query/hooks';

interface ObraDetailPageProps {
  idObra?: string | number;
  obra?: Obra;
}

const STATUS_OPTIONS = [
  'Em Análise Técnica',
  'Documentação em Análise',
  'Instalação liberada',
  'Em andamento',
  'Vistoria Solicitada',
  'Aguardando material',
  'Concluída',
  'Cancelada',
];

export function ObraDetailPage({ idObra, obra: initialObra }: ObraDetailPageProps) {
  const targetId = idObra || initialObra?.id_obra || 0;
  const { data: queriedObra, isLoading } = useObra(targetId);

  const obra = queriedObra || initialObra;
  const [isEditingDriveLink, setIsEditingDriveLink] = useState(false);
  const [driveLinkInput, setDriveLinkInput] = useState('');
  const [isEditingObs, setIsEditingObs] = useState(false);
  const [obsText, setObsText] = useState('');

  useEffect(() => {
    if (obra) {
      setDriveLinkInput(obra.link_fotos || '');
      setObsText(obra.observacoes || '');
    }
  }, [obra]);

  const syncWithGronerMutation = useSyncObraWithGroner();
  const updateStatusMutation = useUpdateObraStatus();
  const updateDriveLinkMutation = useUpdateObraDriveLink();
  const updateObsMutation = useUpdateObraObservacoes();

  const handlePanicSync = async () => {
    if (!obra) return;
    try {
      await syncWithGronerMutation.mutateAsync(obra.id_obra);
    } catch (err: any) {
      alert(`Falha ao sincronizar com o Groner CRM: ${err.message}`);
    }
  };

  const handleStatusSelect = async (newStatus: string) => {
    if (!obra || newStatus === obra.status) return;

    try {
      await updateStatusMutation.mutateAsync({
        id_obra: obra.id_obra,
        status: newStatus,
      });
    } catch (err: any) {
      alert(`Erro ao atualizar status: ${err.message}`);
    }
  };

  const handleSaveDriveLink = async () => {
    if (!obra) return;
    try {
      await updateDriveLinkMutation.mutateAsync({
        id_obra: obra.id_obra,
        link_fotos: driveLinkInput.trim() || null,
      });
      setIsEditingDriveLink(false);
    } catch (err: any) {
      alert(`Erro ao salvar link do Google Drive: ${err.message}`);
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
    } catch (err: any) {
      alert(`Erro ao salvar observações: ${err.message}`);
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

  const getDirectDriveImageUrl = (url: string | null) => {
    if (!url) return null;
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://lh3.googleusercontent.com/u/0/d/${fileIdMatch[1]}=w1000`;
    }
    return null;
  };

  const directImageUrl = getDirectDriveImageUrl(obra.link_fotos);

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-black text-zinc-100">
      {/* Header Fixo de Navegação */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-zinc-800 p-4 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center text-xs text-zinc-400 hover:text-white transition-colors">
          <Button variant="ghost" size="sm" className="px-2.5 py-1.5 h-auto text-zinc-300 min-h-[44px]">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          {/* BOTÃO DE PÂNICO: Sincronização Manual com CRM */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePanicSync}
            disabled={syncWithGronerMutation.isPending}
            className="h-9 text-xs border-[#ffc61e]/40 bg-[#ffc61e]/10 text-[#ffc61e] hover:bg-[#ffc61e]/20 px-3 font-semibold transition-all min-h-[44px]"
            title="Botão de Pânico: Forçar sincronização manual com o Groner CRM"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncWithGronerMutation.isPending ? 'animate-spin text-[#ffc61e]' : ''}`} />
            {syncWithGronerMutation.isPending ? 'Sincronizando...' : 'Sincronizar CRM'}
          </Button>

          <span className="font-mono text-xs text-[#ffc61e] bg-[#ffc61e]/15 px-2.5 py-1 rounded-md border border-[#ffc61e]/30 font-bold">
            #{obra.id_obra}
          </span>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Banner do Cliente & Status */}
        <div className="space-y-3 bg-zinc-900/90 p-4 rounded-2xl border border-zinc-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-[#ffc61e] tracking-wider">Cliente</span>
            {updateStatusMutation.isPending ? (
              <span className="text-xs text-[#ffc61e] flex items-center gap-1 font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Atualizando status...
              </span>
            ) : null}
          </div>

          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-white leading-tight tracking-tight">{obra.cliente}</h1>
            {/* Ícone de Refresh no título */}
            <button
              onClick={handlePanicSync}
              disabled={syncWithGronerMutation.isPending}
              className="p-2 text-zinc-400 hover:text-[#ffc61e] hover:bg-zinc-800 rounded-lg transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Forçar atualização dos dados da obra"
            >
              <RefreshCw className={`w-4 h-4 ${syncWithGronerMutation.isPending ? 'animate-spin text-[#ffc61e]' : ''}`} />
            </button>
          </div>

          {/* Select de Status */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs text-zinc-400 font-semibold">Status Atual (Clique para alterar):</label>
            <div className="relative">
              <select
                value={obra.status}
                onChange={(e) => handleStatusSelect(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-xs font-bold text-zinc-100 rounded-xl px-3 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#ffc61e] cursor-pointer min-h-[48px]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="bg-zinc-900 text-zinc-100">
                    {opt}
                  </option>
                ))}
                {!STATUS_OPTIONS.includes(obra.status) && (
                  <option value={obra.status} className="bg-zinc-900 text-zinc-100">
                    {obra.status}
                  </option>
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
                ▼
              </div>
            </div>
          </div>

          {obra.instalador && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-300 pt-2 border-t border-zinc-800/60">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Técnico Responsável: <strong className="text-white font-bold">{obra.instalador}</strong></span>
            </div>
          )}
        </div>

        {/* BLOCO 1: Contato e Logística */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-[#ffc61e] uppercase tracking-wider px-1">
            Contato e Logística
          </h2>

          {obra.telefone && obra.telefone !== 'Sem telefone' ? (
            <a href={`tel:${obra.telefone.replace(/\D/g, '')}`} className="block w-full">
              <Card className="p-4 bg-emerald-950/40 border-emerald-500/40 hover:bg-emerald-900/50 hover:border-emerald-500/60 active:scale-[0.99] transition-all group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                      <PhoneCall className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Ligar para o Cliente</span>
                      <p className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {obra.telefone}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 px-3 py-1 text-xs font-bold">
                    Um Toque
                  </Badge>
                </div>
              </Card>
            </a>
          ) : (
            <Card className="p-3 bg-zinc-900/50 border-zinc-800 text-zinc-400 text-xs flex items-center justify-between">
              <span>Telefone não cadastrado para esta obra.</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePanicSync}
                disabled={syncWithGronerMutation.isPending}
                className="h-8 text-xs border-[#ffc61e]/40 text-[#ffc61e] min-h-[44px]"
              >
                Buscar CRM
              </Button>
            </Card>
          )}

          {obra.link_maps && obra.link_maps !== 'Coordenadas ausentes' ? (
            <a href={obra.link_maps} target="_blank" rel="noopener noreferrer" className="block w-full">
              <Card className="p-4 bg-zinc-900/90 border-zinc-800 hover:border-[#ffc61e]/50 hover:bg-zinc-800/90 active:scale-[0.99] transition-all group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ffc61e]/15 border border-[#ffc61e]/30 flex items-center justify-center text-[#ffc61e] shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#ffc61e] uppercase tracking-wider">{obra.cidade}</span>
                      <span className="text-xs text-zinc-400 flex items-center gap-1 group-hover:text-[#ffc61e] transition-colors font-semibold">
                        Navegar GPS <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <p className="text-sm font-medium text-zinc-200 leading-snug break-words">
                      {obra.endereco}
                    </p>
                  </div>
                </div>
              </Card>
            </a>
          ) : (
            <Card className="p-4 bg-zinc-900/90 border-zinc-800 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-[#ffc61e] uppercase tracking-wider">{obra.cidade}</span>
                    <p className="text-sm text-zinc-300">{obra.endereco}</p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePanicSync}
                  disabled={syncWithGronerMutation.isPending}
                  className="h-8 text-xs border-[#ffc61e]/40 text-[#ffc61e] hover:bg-[#ffc61e]/10 shrink-0 min-h-[44px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncWithGronerMutation.isPending ? 'animate-spin' : ''}`} />
                  Buscar Endereço
                </Button>
              </div>
            </Card>
          )}
        </section>

        {/* BLOCO 2: Engenharia */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-[#ffc61e] uppercase tracking-wider px-1">
            Especificações de Engenharia
          </h2>

          <Card className="p-4 border-zinc-800 bg-zinc-900/90 space-y-4">
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-zinc-800">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#ffc61e] font-bold">
                  <Zap className="w-4 h-4" /> Potência Total
                </div>
                <p className="text-xl font-bold text-white">
                  {obra.potencia_total_kwp ? obra.potencia_total_kwp.toFixed(2) : '0'} <span className="text-xs font-normal text-zinc-400">kWp</span>
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#ffc61e] font-bold">
                  <Layers className="w-4 h-4" /> Ligação
                </div>
                <p className="text-base font-bold text-white">
                  {obra.tipo_ligacao || 'Não definida'}
                </p>
              </div>
            </div>

            {/* Inversor */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#ffc61e] uppercase tracking-wider">
                <Cpu className="w-4 h-4" /> Inversor Solar
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                <div>
                  <span className="text-zinc-400 block font-medium">Marca</span>
                  <span className="font-semibold text-zinc-200">{obra.inversor_marca}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-medium">Potência Inversor</span>
                  <span className="font-semibold text-zinc-200">{obra.potencia_inversor_kw} kW</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-zinc-800/50">
                  <span className="text-zinc-400 block font-medium">Modelo</span>
                  <span className="font-semibold text-zinc-200 break-words">{obra.inversor_modelo}</span>
                </div>
              </div>
            </div>

            {/* Módulos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#ffc61e] uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> Módulos Fotovoltaicos
                </div>
                <span className="text-[#ffc61e] font-mono font-bold bg-[#ffc61e]/15 px-2 py-0.5 rounded border border-[#ffc61e]/30">
                  {obra.qtd_modulos} placas
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                <div>
                  <span className="text-zinc-400 block font-medium">Marca Placa</span>
                  <span className="font-semibold text-zinc-200">{obra.modulos_marca}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-medium">Potência Unitária</span>
                  <span className="font-semibold text-zinc-200">{obra.potencia_modulo_w} W</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-zinc-800/50">
                  <span className="text-zinc-400 block font-medium">Modelo Placa</span>
                  <span className="font-semibold text-zinc-200 break-words">{obra.modulos_modelo}</span>
                </div>
              </div>
            </div>

            {/* Telhado e Data */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800 text-xs">
              <div className="space-y-0.5">
                <span className="text-zinc-400 flex items-center gap-1 font-medium">
                  <Home className="w-3.5 h-3.5 text-zinc-400" /> Tipo Telhado
                </span>
                <span className="font-semibold text-zinc-200 block">{obra.tipo_telhado}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-zinc-400 flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Data Status
                </span>
                <span className="font-semibold text-zinc-200 block">{obra.data_instalacao}</span>
              </div>
            </div>
          </Card>
        </section>

        {/* BLOCO 3: Captura de Fotos Nativa & Pasta do Drive */}
        <section className="space-y-3">
          <PhotoCapture obraId={obra.id_obra} />

          {/* Pasta do Drive */}
          <Card className="p-4 border-zinc-800 bg-zinc-900/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-[#ffc61e]" /> Pasta do Google Drive
              </span>

              {!isEditingDriveLink ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingDriveLink(true)}
                  className="h-8 text-xs text-[#ffc61e] hover:text-[#e5b010] p-1 font-semibold"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" /> {obra.link_fotos ? 'Alterar Link' : 'Adicionar Link'}
                </Button>
              ) : null}
            </div>

            {directImageUrl && !isEditingDriveLink ? (
              <div className="relative w-full h-48 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={directImageUrl}
                  alt={`Imagem da obra #${obra.id_obra}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}

            {isEditingDriveLink ? (
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-medium">Cole o link da pasta ou arquivo do Google Drive:</label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                  <Input
                    type="url"
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={driveLinkInput}
                    onChange={(e) => setDriveLinkInput(e.target.value)}
                    className="pl-9 bg-zinc-950 border-zinc-700 text-xs focus:ring-2 focus:ring-[#ffc61e] min-h-[44px]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingDriveLink(false)}
                    disabled={updateDriveLinkMutation.isPending}
                    className="h-8 text-xs min-h-[44px]"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveDriveLink}
                    disabled={updateDriveLinkMutation.isPending}
                    className="h-8 text-xs min-h-[44px]"
                  >
                    {updateDriveLinkMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    )}
                    Salvar Link
                  </Button>
                </div>
              </div>
            ) : obra.link_fotos ? (
              <a href={obra.link_fotos} target="_blank" rel="noopener noreferrer" className="block w-full">
                <Button variant="secondary" className="w-full justify-between h-11 border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800">
                  <span className="flex items-center gap-2 text-xs font-bold text-zinc-200 truncate pr-2">
                    <Folder className="w-4 h-4 text-[#ffc61e] shrink-0" /> Abrir Pasta no Google Drive
                  </span>
                  <ExternalLink className="w-4 h-4 text-zinc-400 shrink-0" />
                </Button>
              </a>
            ) : (
              <div className="text-xs text-zinc-400 p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/60 flex items-center justify-between">
                <span>Nenhum link do Google Drive cadastrado.</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingDriveLink(true)}
                  className="h-8 text-xs border-[#ffc61e]/40 text-[#ffc61e] min-h-[44px]"
                >
                  Adicionar
                </Button>
              </div>
            )}
          </Card>

          {/* Observações Editáveis */}
          <Card className="p-4 border-zinc-800 bg-zinc-900/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#ffc61e]" /> Observações de Campo
              </span>

              {!isEditingObs ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingObs(true)}
                  className="h-8 text-xs text-[#ffc61e] hover:text-[#e5b010] p-1 font-semibold"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" /> Editar
                </Button>
              ) : null}
            </div>

            {isEditingObs ? (
              <div className="space-y-2">
                <textarea
                  value={obsText}
                  onChange={(e) => setObsText(e.target.value)}
                  rows={4}
                  placeholder="Escreva anotações sobre o andamento da instalação..."
                  className="w-full bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#ffc61e]"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingObs(false)}
                    disabled={updateObsMutation.isPending}
                    className="h-8 text-xs min-h-[44px]"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveObs}
                    disabled={updateObsMutation.isPending}
                    className="h-8 text-xs min-h-[44px]"
                  >
                    {updateObsMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    )}
                    Salvar Observações
                  </Button>
                </div>
              </div>
            ) : (
              <div className="max-w-[65ch]">
                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 font-normal">
                  {obra.observacoes || 'Nenhuma observação registrada.'}
                </p>
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}
