'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useObra } from '@/lib/query/hooks';
import {
  useUpdateObraStatus,
  useUpdateObraObservacoes,
  useUpdateObraDriveLink,
  useSyncObraWithGroner,
} from '@/lib/query/mutations';
import { PhotoCapture } from './photo-capture';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  PhoneCall,
  MapPin,
  ExternalLink,
  Zap,
  Cpu,
  Layers,
  Home,
  Calendar,
  UserCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Edit3,
  RefreshCw,
  Link as LinkIcon,
  Folder,
  Check,
} from 'lucide-react';

interface ObraDetailPageProps {
  idObra: string;
}

const STATUS_OPTIONS = [
  'Em Análise Técnica',
  'Instalação liberada',
  'Em andamento',
  'Aguardando material',
  'Instalação concluída',
  'Vistoria Solicitada',
  'Bloqueada',
];

function getDirectDriveImageUrl(url: string = ''): string | null {
  if (!url) return null;

  if (url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.includes('images.unsplash.com')) {
    return url;
  }

  const driveFileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveFileMatch[1]}`;
  }

  const driveIdMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (driveIdMatch && driveIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
  }

  return null;
}

export function ObraDetailPage({ idObra }: ObraDetailPageProps) {
  const { data: obra, isLoading, error } = useObra(idObra);
  
  // Mutations do TanStack Query
  const updateStatusMutation = useUpdateObraStatus();
  const updateObsMutation = useUpdateObraObservacoes();
  const updateDriveLinkMutation = useUpdateObraDriveLink();
  const syncWithGronerMutation = useSyncObraWithGroner();

  const [obsText, setObsText] = useState('');
  const [isEditingObs, setIsEditingObs] = useState(false);

  const [driveLinkInput, setDriveLinkInput] = useState('');
  const [isEditingDriveLink, setIsEditingDriveLink] = useState(false);

  // Toast / Feedback de Sincronização
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (obra?.observacoes) {
      setObsText(obra.observacoes);
    }
    if (obra?.link_fotos) {
      setDriveLinkInput(obra.link_fotos);
    }
  }, [obra?.observacoes, obra?.link_fotos]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Botão de Pânico / Fallback Sync Manual
  const handlePanicSync = () => {
    if (!obra?.id_obra) return;
    setToastMessage(null);

    syncWithGronerMutation.mutate(obra.id_obra, {
      onSuccess: () => {
        showToast('success', 'Dados atualizados do CRM com sucesso!');
      },
      onError: (err: any) => {
        showToast('error', err.message || 'Erro ao sincronizar com o Groner.');
      },
    });
  };

  const handleStatusSelect = (newStatus: string) => {
    if (!obra) return;
    updateStatusMutation.mutate({
      id_obra: obra.id_obra,
      status: newStatus,
    });
  };

  const handleSaveObs = () => {
    if (!obra) return;
    updateObsMutation.mutate({
      id_obra: obra.id_obra,
      observacoes: obsText,
    });
    setIsEditingObs(false);
  };

  const handleSaveDriveLink = () => {
    if (!obra) return;
    updateDriveLinkMutation.mutate({
      id_obra: obra.id_obra,
      link_fotos: driveLinkInput.trim(),
    });
    setIsEditingDriveLink(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen p-4 space-y-4 animate-pulse">
        <div className="h-10 w-24 bg-zinc-800 rounded-xl"></div>
        <div className="h-20 bg-zinc-900 rounded-xl border border-zinc-800"></div>
        <div className="h-28 bg-zinc-900 rounded-xl border border-zinc-800"></div>
        <div className="h-48 bg-zinc-900 rounded-xl border border-zinc-800"></div>
      </div>
    );
  }

  if (error || !obra) {
    return (
      <div className="flex flex-col min-h-screen p-4 space-y-4 items-center justify-center text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white">Obra não encontrada</h2>
        <p className="text-xs text-zinc-400 max-w-xs">
          Não foi possível carregar os dados da obra #{idObra}. Verifique se o ID está correto.
        </p>
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para a lista
          </Button>
        </Link>
      </div>
    );
  }

  const directImageUrl = getDirectDriveImageUrl(obra.link_fotos);

  return (
    <div className="flex flex-col min-h-screen pb-12 bg-zinc-950 text-zinc-100 relative">
      {/* Toast Notification Flutuante */}
      {toastMessage && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-300'
              : 'bg-red-950/95 border-red-500/50 text-red-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Fixo */}
      <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 p-4 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center text-xs text-zinc-400 hover:text-white transition-colors">
          <Button variant="ghost" size="sm" className="px-2.5 py-1.5 h-auto text-zinc-300">
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
            className="h-8 text-xs border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 px-2.5 transition-all"
            title="Botão de Pânico: Forçar sincronização manual com o Groner CRM"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncWithGronerMutation.isPending ? 'animate-spin text-orange-300' : ''}`} />
            {syncWithGronerMutation.isPending ? 'Sincronizando...' : 'Sincronizar CRM'}
          </Button>

          <span className="font-mono text-xs text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-md border border-orange-500/20 font-bold">
            #{obra.id_obra}
          </span>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Banner do Cliente & Status */}
        <div className="space-y-3 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 rounded-2xl border border-zinc-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">Cliente</span>
            {updateStatusMutation.isPending ? (
              <span className="text-xs text-orange-400 flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Atualizando status...
              </span>
            ) : null}
          </div>

          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-extrabold text-white leading-tight">{obra.cliente}</h1>
            {/* Ícone pequeno de Refresh direto no título para fallback rápido */}
            <button
              onClick={handlePanicSync}
              disabled={syncWithGronerMutation.isPending}
              className="p-1.5 text-zinc-400 hover:text-orange-400 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
              title="Forçar atualização dos dados da obra"
            >
              <RefreshCw className={`w-4 h-4 ${syncWithGronerMutation.isPending ? 'animate-spin text-orange-400' : ''}`} />
            </button>
          </div>

          {/* Select de Status */}
          <div className="space-y-1 pt-1">
            <label className="text-[11px] text-zinc-400 font-medium">Status Atual (Clique para alterar):</label>
            <div className="relative">
              <select
                value={obra.status}
                onChange={(e) => handleStatusSelect(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-xs font-bold text-zinc-100 rounded-xl px-3 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
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
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 pt-1 border-t border-zinc-800/60">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Técnico Responsável: <strong className="text-zinc-200">{obra.instalador}</strong></span>
            </div>
          )}
        </div>

        {/* BLOCO 1: Contato e Logística */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">
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
                      <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Ligar para o Cliente</span>
                      <p className="text-base font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                        {obra.telefone}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 px-3 py-1 text-xs">
                    Um Toque
                  </Badge>
                </div>
              </Card>
            </a>
          ) : (
            <Card className="p-3 bg-zinc-900/50 border-zinc-800 text-zinc-500 text-xs flex items-center justify-between">
              <span>Telefone não cadastrado para esta obra.</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePanicSync}
                disabled={syncWithGronerMutation.isPending}
                className="h-7 text-[11px] border-orange-500/30 text-orange-400"
              >
                Buscar CRM
              </Button>
            </Card>
          )}

          {obra.link_maps && obra.link_maps !== 'Coordenadas ausentes' ? (
            <a href={obra.link_maps} target="_blank" rel="noopener noreferrer" className="block w-full">
              <Card className="p-4 bg-zinc-900/90 border-zinc-800 hover:border-orange-500/50 hover:bg-zinc-800/90 active:scale-[0.99] transition-all group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">{obra.cidade}</span>
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1 group-hover:text-orange-400 transition-colors">
                        Navegar GPS <ExternalLink className="w-3 h-3" />
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
                  <MapPin className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-zinc-400 uppercase">{obra.cidade}</span>
                    <p className="text-sm text-zinc-300">{obra.endereco}</p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePanicSync}
                  disabled={syncWithGronerMutation.isPending}
                  className="h-7 text-xs border-orange-500/30 text-orange-400 hover:bg-orange-500/10 shrink-0"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${syncWithGronerMutation.isPending ? 'animate-spin' : ''}`} />
                  Buscar Endereço
                </Button>
              </div>
            </Card>
          )}
        </section>

        {/* BLOCO 2: Engenharia */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">
            Especificações de Engenharia
          </h2>

          <Card className="p-4 border-zinc-800 bg-zinc-900/90 space-y-4">
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-zinc-800">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                  <Zap className="w-4 h-4" /> Potência Total
                </div>
                <p className="text-xl font-extrabold text-white">
                  {obra.potencia_total_kwp ? obra.potencia_total_kwp.toFixed(2) : '0'} <span className="text-xs font-normal text-zinc-400">kWp</span>
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-orange-400 font-semibold">
                  <Layers className="w-4 h-4" /> Ligação
                </div>
                <p className="text-base font-bold text-white">
                  {obra.tipo_ligacao || 'Não definida'}
                </p>
              </div>
            </div>

            {/* Inversor */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400 uppercase tracking-wider">
                <Cpu className="w-4 h-4" /> Inversor Solar
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                <div>
                  <span className="text-zinc-500 block">Marca</span>
                  <span className="font-semibold text-zinc-200">{obra.inversor_marca}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Potência Inversor</span>
                  <span className="font-semibold text-zinc-200">{obra.potencia_inversor_kw} kW</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-zinc-800/50">
                  <span className="text-zinc-500 block">Modelo</span>
                  <span className="font-medium text-zinc-300 break-words">{obra.inversor_modelo}</span>
                </div>
              </div>
            </div>

            {/* Módulos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-orange-400 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> Módulos Fotovoltaicos
                </div>
                <span className="text-amber-400 font-mono font-extrabold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {obra.qtd_modulos} placas
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                <div>
                  <span className="text-zinc-500 block">Marca Placa</span>
                  <span className="font-semibold text-zinc-200">{obra.modulos_marca}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Potência Unitária</span>
                  <span className="font-semibold text-zinc-200">{obra.potencia_modulo_w} W</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-zinc-800/50">
                  <span className="text-zinc-500 block">Modelo Placa</span>
                  <span className="font-medium text-zinc-300 break-words">{obra.modulos_modelo}</span>
                </div>
              </div>
            </div>

            {/* Telhado e Data */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800 text-xs">
              <div className="space-y-0.5">
                <span className="text-zinc-500 flex items-center gap-1">
                  <Home className="w-3.5 h-3.5 text-zinc-400" /> Tipo Telhado
                </span>
                <span className="font-semibold text-zinc-200 block">{obra.tipo_telhado}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-zinc-500 flex items-center gap-1">
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
                <Folder className="w-4 h-4 text-amber-400" /> Pasta do Google Drive
              </span>

              {!isEditingDriveLink ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingDriveLink(true)}
                  className="h-7 text-xs text-orange-400 hover:text-orange-300 p-1"
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
                <label className="text-[11px] text-zinc-400">Cole o link da pasta ou arquivo do Google Drive:</label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                  <Input
                    type="url"
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={driveLinkInput}
                    onChange={(e) => setDriveLinkInput(e.target.value)}
                    className="pl-9 bg-zinc-950 border-zinc-700 text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingDriveLink(false)}
                    disabled={updateDriveLinkMutation.isPending}
                    className="h-8 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveDriveLink}
                    disabled={updateDriveLinkMutation.isPending}
                    className="h-8 text-xs"
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
                  <span className="flex items-center gap-2 text-xs font-semibold text-zinc-200 truncate pr-2">
                    <Folder className="w-4 h-4 text-amber-400 shrink-0" /> Abrir Pasta no Google Drive
                  </span>
                  <ExternalLink className="w-4 h-4 text-zinc-400 shrink-0" />
                </Button>
              </a>
            ) : (
              <div className="text-xs text-zinc-500 p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 flex items-center justify-between">
                <span>Nenhum link do Google Drive cadastrado.</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingDriveLink(true)}
                  className="h-7 text-xs border-orange-500/30 text-orange-400"
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
                <FileText className="w-4 h-4 text-orange-400" /> Observações de Campo
              </span>

              {!isEditingObs ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingObs(true)}
                  className="h-7 text-xs text-orange-400 hover:text-orange-300 p-1"
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
                  className="w-full bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingObs(false)}
                    disabled={updateObsMutation.isPending}
                    className="h-8 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveObs}
                    disabled={updateObsMutation.isPending}
                    className="h-8 text-xs"
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
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                {obra.observacoes || 'Nenhuma observação registrada.'}
              </p>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}

function FolderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L8.6 3.3A2 2 0 0 0 6.9 2.5H4a2 2 0 0 0-2 2v13.5a2 2 0 0 0 2 2Z" />
    </svg>
  );
}
