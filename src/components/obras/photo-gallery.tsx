'use client';

import React, { useState, ChangeEvent, useMemo } from 'react';
import Link from 'next/link';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { useOfflinePhotoUpload } from '@/hooks/use-offline-photo-upload';
import { useObraPhotos, usePerfil, useDeletePhoto } from '@/lib/query/hooks';
import { removeOfflinePhoto } from '@/lib/offline-photo-store';
import { PROJECT_SUBCATEGORIES } from '@/lib/supabase/types';
import { ProjectPhotoDropzone } from './project-photo-dropzone';
import { CategoryIcon } from './category-icon';
import {
  Camera,
  Upload,
  ImageIcon,
  Loader2,
  Wifi,
  WifiOff,
  Folder,
  CheckCircle2,
  Maximize2,
  Layers,
  Trash2,
  UploadCloud,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface PhotoGalleryProps {
  obraId: number;
}

interface PhotoDeleteTarget {
  id: string;
  storagePath?: string;
  isOffline?: boolean;
  fileName?: string;
}

export function PhotoGallery({ obraId }: PhotoGalleryProps) {
  const [activeTab, setActiveTab] = useState<'registro' | 'projeto'>('registro');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showInlineDropzone, setShowInlineDropzone] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<PhotoDeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  // Perfil do usuário atual para verificar permissão de ADMIN
  const { data: perfil } = usePerfil();
  const isAdmin = perfil?.role === 'admin';

  // Motor offline e upload para instaladores (Campo)
  const {
    capturePhoto,
    syncOfflinePhotos,
    pendingCount,
    localPreviews,
    isOnline,
    isSyncing,
  } = useOfflinePhotoUpload(obraId);

  // Fotos oficiais do Supabase separadas por categoria e subcategoria
  const { data: photosData } = useObraPhotos(obraId);
  const registroPhotos = photosData?.registroPhotos || [];
  const projetoPhotos = photosData?.projetoPhotos || [];
  const projetoPhotosBySubcategory = photosData?.projetoPhotosBySubcategory || {};

  // Mutation para exclusão definitiva (Hard Delete)
  const deletePhotoMutation = useDeletePhoto();

  // Captura foto da câmera nativa (Aba Registro)
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await capturePhoto(file);
    e.target.value = '';
  };

  // Processa a exclusão confirmada no modal
  const handleConfirmDelete = async () => {
    if (!photoToDelete) return;

    setIsDeleting(true);
    setDeleteErrorMessage(null);

    try {
      if (photoToDelete.isOffline) {
        await removeOfflinePhoto(photoToDelete.id);
        syncOfflinePhotos();
      } else if (photoToDelete.storagePath) {
        await deletePhotoMutation.mutateAsync({
          photoId: photoToDelete.id,
          storagePath: photoToDelete.storagePath,
          idObra: obraId,
        });
      }
      setPhotoToDelete(null);
    } catch (err: any) {
      setDeleteErrorMessage(err.message || 'Falha ao excluir foto.');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * P0 FIX - Agrupamento de Fotos de Projeto:
   * Garante que nenhuma foto seja escondida, identificando todas as subcategorias
   * definidas E agrupando fotos sem subcategoria ou com subcategoria 'geral'/'outros'.
   */
  const groupedProjectSections = useMemo(() => {
    const sections: Array<{
      id: string;
      label: string;
      photos: typeof projetoPhotos;
    }> = [];

    // 1. Mapeia as subcategorias conhecidas
    const matchedPhotoIds = new Set<string>();

    for (const subcat of PROJECT_SUBCATEGORIES) {
      const photos = projetoPhotosBySubcategory[subcat.id] || [];
      if (photos.length > 0) {
        sections.push({
          id: subcat.id,
          label: subcat.label,
          photos,
        });
        photos.forEach((p) => matchedPhotoIds.add(p.id));
      }
    }

    // 2. Fallback de Segurança: Fotos sem subcategoria ou com tag não reconhecida
    const orphanedPhotos = projetoPhotos.filter((p) => !matchedPhotoIds.has(p.id));
    if (orphanedPhotos.length > 0) {
      sections.push({
        id: 'outros',
        label: 'Geral / Outros Documentos',
        photos: orphanedPhotos,
      });
    }

    return sections;
  }, [projetoPhotos, projetoPhotosBySubcategory]);

  // Lista linear de fotos de projeto para índice do Lightbox
  const flattenedProjectPhotos = useMemo(() => {
    return groupedProjectSections.flatMap((s) => s.photos);
  }, [groupedProjectSections]);

  // Consolidação dinâmica dos slides para o Lightbox baseada na Aba Ativa
  const currentSlides = useMemo(() => {
    if (activeTab === 'registro') {
      return [
        ...localPreviews.map((prev) => ({ src: prev.url, alt: 'Foto Local Pendente' })),
        ...registroPhotos.map((photo) => ({
          src: photo.public_url,
          alt: photo.file_name || 'Foto de Campo',
        })),
      ];
    }

    return flattenedProjectPhotos.map((photo) => {
      const subInfo = PROJECT_SUBCATEGORIES.find((s) => s.id === photo.subcategory);
      return {
        src: photo.public_url,
        alt: `${subInfo ? `${subInfo.label} - ` : ''}${photo.file_name || 'Foto do Projeto'}`,
      };
    });
  }, [activeTab, localPreviews, registroPhotos, flattenedProjectPhotos]);

  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <Card className="p-4 sm:p-5 border-zinc-800 bg-zinc-900/90 space-y-4 shadow-lg">
      {/* Abas Superiores ('Registro' vs 'Projeto') */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-3 gap-3">
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-bold w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('registro')}
            className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'registro'
                ? 'bg-[#ffc61e] text-black shadow-md font-extrabold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <Camera className="w-4 h-4" /> Registro ({registroPhotos.length + localPreviews.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('projeto')}
            className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'projeto'
                ? 'bg-[#ffc61e] text-black shadow-md font-extrabold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <Folder className="w-4 h-4" /> Projeto ({projetoPhotos.length})
          </button>
        </div>

        {/* Indicador Online/Offline */}
        <div className="flex items-center justify-end gap-1.5 text-xs font-semibold">
          {isOnline ? (
            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <Wifi className="w-3.5 h-3.5" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
              <WifiOff className="w-3.5 h-3.5" /> Offline
            </span>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 'PROJETO' (Visualização Organizada por Subcategorias + Dropzone Inline)*/}
      {/* ========================================================================= */}
      {activeTab === 'projeto' && (
        <div className="space-y-4">
          {/* Ações de Gestão de Fotos de Projeto */}
          {isAdmin && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <Button
                  type="button"
                  onClick={() => setShowInlineDropzone(!showInlineDropzone)}
                  className="min-h-[44px] px-4 bg-[#ffc61e] hover:bg-[#e5b010] text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 rounded-xl shadow-md border-none"
                >
                  <UploadCloud className="w-4 h-4 stroke-[2.2]" />
                  <span>{showInlineDropzone ? 'Ocultar Envio de Fotos' : 'Enviar Fotos do Projeto'}</span>
                  {showInlineDropzone ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>

                <Link
                  href={`/obra/${obraId}/projeto`}
                  className="text-xs text-zinc-400 hover:text-[#ffc61e] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 min-h-[44px] transition-colors"
                >
                  <span>Abrir Organizador Completo (PC)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Uploader Inline Integrado */}
              {showInlineDropzone && (
                <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 shadow-inner animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-[#ffc61e]" /> Upload Direto de Fotos de Projeto
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowInlineDropzone(false)}
                      className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-900"
                    >
                      Fechar
                    </button>
                  </div>
                  <ProjectPhotoDropzone obraId={obraId} />
                </div>
              )}
            </div>
          )}

          {groupedProjectSections.length > 0 ? (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1 font-semibold border-b border-zinc-800 pb-2">
                <span className="flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-[#ffc61e]" /> Documentação do Projeto ({projetoPhotos.length})
                </span>
                <span className="text-xs text-zinc-500">Clique na miniatura para ampliar</span>
              </div>

              {/* Renderiza blocos para cada subcategoria que possui fotos */}
              <div className="space-y-4">
                {groupedProjectSections.map((section) => (
                  <div key={section.id} className="space-y-2.5 bg-zinc-950/70 p-3.5 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-2 px-1">
                      <CategoryIcon id={section.id} className="w-4 h-4 text-[#ffc61e]" />
                      <h4 className="text-xs font-bold text-white">{section.label}</h4>
                      <span className="text-xs font-extrabold text-[#ffc61e] bg-[#ffc61e]/15 px-2 py-0.5 rounded-full border border-[#ffc61e]/30">
                        {section.photos.length}
                      </span>
                    </div>

                    {/* Mobile Scroll-Snap Carousel | Desktop Grid */}
                    <div className="flex sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 overflow-x-auto snap-x snap-mandatory sm:overflow-visible pb-1 no-scrollbar">
                      {section.photos.map((photo) => {
                        const globalIndex = flattenedProjectPhotos.findIndex((p) => p.id === photo.id);
                        return (
                          <div
                            key={photo.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`Ampliar foto: ${photo.file_name || section.label}`}
                            onClick={() => handleOpenLightbox(globalIndex >= 0 ? globalIndex : 0)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleOpenLightbox(globalIndex >= 0 ? globalIndex : 0);
                              }
                            }}
                            className="relative w-32 h-32 sm:w-auto sm:aspect-square shrink-0 snap-center rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-md group cursor-pointer hover:border-[#ffc61e]/70 focus-visible:ring-2 focus-visible:ring-[#ffc61e] focus-visible:outline-none transition-all duration-150"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.public_url}
                              alt={photo.file_name || 'Foto do Projeto'}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-2">
                              <div className="flex justify-between items-center">
                                {/* Botão de Exclusão (Admin Only) */}
                                {isAdmin ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPhotoToDelete({
                                        id: photo.id,
                                        storagePath: photo.storage_path,
                                        fileName: photo.file_name,
                                      });
                                    }}
                                    className="p-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 text-white shadow-md transition-all active:scale-90 min-h-[32px] min-w-[32px] flex items-center justify-center"
                                    title="Excluir foto permanentemente"
                                    aria-label="Excluir foto do projeto permanentemente"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                                  </button>
                                ) : (
                                  <div />
                                )}
                                <Maximize2 className="w-3.5 h-3.5 text-white opacity-80" />
                              </div>
                              <div className="flex items-center gap-1 text-xs text-zinc-200 font-bold bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded truncate border border-zinc-700/60">
                                <span className="truncate">{photo.file_name || 'Projeto'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : isAdmin ? (
            <div className="space-y-3 pt-1">
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <UploadCloud className="w-4 h-4 text-[#ffc61e]" />
                  <span>Nenhuma foto enviada ainda. Faça o primeiro upload abaixo:</span>
                </div>
                <ProjectPhotoDropzone obraId={obraId} />
              </div>
            </div>
          ) : (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-2">
              <Folder className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400 font-medium">
                Nenhum arquivo de projeto cadastrado para esta obra.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 'REGISTRO' (Campo Instaladores PWA - Captura Câmera Nativa)            */}
      {/* ========================================================================= */}
      {activeTab === 'registro' && (
        <div className="space-y-4">
          {/* Botão de Câmera Nativa */}
          <label htmlFor="camera-file-input" className="block w-full cursor-pointer">
            <div className="w-full h-12 sm:h-14 rounded-xl bg-[#ffc61e] hover:bg-[#e5b010] text-black font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg border border-[#ffc61e]/50 active:scale-[0.99] transition-all">
              <Camera className="w-5 h-5 stroke-[2.5]" />
              <span>Tirar Foto com a Câmera</span>
            </div>
            <input
              id="camera-file-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Tirar ou selecionar foto da obra"
            />
          </label>

          {/* Banner de Sincronização */}
          {pendingCount > 0 && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#ffc61e]/10 border border-[#ffc61e]/30 text-xs text-[#ffc61e]">
              <div className="flex items-center gap-2">
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#ffc61e]" />
                ) : (
                  <Upload className="w-4 h-4 text-[#ffc61e]" />
                )}
                <span className="font-bold">
                  {isSyncing
                    ? 'Sincronizando fotos...'
                    : `${pendingCount} foto(s) no cofre offline`}
                </span>
              </div>

              {isOnline && !isSyncing && (
                <Button
                  size="sm"
                  onClick={() => syncOfflinePhotos()}
                  className="h-9 px-4 text-xs bg-[#ffc61e] text-black hover:bg-[#e5b010] font-extrabold border-none min-h-[44px]"
                >
                  Sincronizar Agora
                </Button>
              )}
            </div>
          )}

          {/* Galeria de Campo (Mobile Carousel vs Desktop Grid) */}
          {localPreviews.length > 0 || registroPhotos.length > 0 ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#ffc61e]" /> Galeria de Campo (
                  {localPreviews.length + registroPhotos.length})
                </span>
                <span className="text-xs text-zinc-500 hidden sm:inline">Clique para ampliar</span>
                <span className="text-xs text-zinc-500 sm:hidden">Deslize para o lado ➔</span>
              </div>

              {/* Mobile Scroll-Snap Carousel */}
              <div className="sm:hidden flex overflow-x-auto gap-3 snap-x snap-mandatory pb-3 pt-1 no-scrollbar scroll-smooth">
                {/* 1. Miniaturas Locais Pendentes */}
                {localPreviews.map((prev, index) => (
                  <div
                    key={prev.id}
                    role="button"
                    tabIndex={0}
                    aria-label="Ampliar foto offline pendente"
                    onClick={() => handleOpenLightbox(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenLightbox(index);
                      }
                    }}
                    className="relative w-36 h-36 shrink-0 snap-center rounded-2xl overflow-hidden border-2 border-[#ffc61e] bg-zinc-950 shadow-md group cursor-pointer focus-visible:ring-2 focus-visible:ring-[#ffc61e] focus-visible:outline-none"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={prev.url}
                      alt="Preview Foto Offline"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-2.5">
                      <div className="flex justify-between items-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoToDelete({
                              id: prev.id,
                              isOffline: true,
                            });
                          }}
                          className="p-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 text-white shadow-md transition-all active:scale-90 min-h-[32px] min-w-[32px] flex items-center justify-center"
                          title="Remover foto do cofre offline"
                          aria-label="Remover foto do cofre offline"
                        >
                          <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                        </button>
                        <Maximize2 className="w-4 h-4 text-white opacity-80" />
                      </div>
                      <div className="bg-[#ffc61e] text-black text-xs font-extrabold px-2 py-0.5 rounded-md text-center shadow">
                        {isSyncing ? 'Enviando...' : 'Offline'}
                      </div>
                    </div>
                  </div>
                ))}

                {/* 2. Miniaturas Salvas na Nuvem */}
                {registroPhotos.map((photo, index) => {
                  const globalIndex = localPreviews.length + index;
                  return (
                    <div
                      key={photo.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Ampliar foto: ${photo.file_name || 'Foto Oficial'}`}
                      onClick={() => handleOpenLightbox(globalIndex)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpenLightbox(globalIndex);
                        }
                      }}
                      className="relative w-36 h-36 shrink-0 snap-center rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-md group cursor-pointer hover:border-[#ffc61e]/70 focus-visible:ring-2 focus-visible:ring-[#ffc61e] focus-visible:outline-none transition-all duration-150"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.public_url}
                        alt={photo.file_name || 'Foto Oficial'}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-2.5">
                        <div className="flex justify-between items-center">
                          {/* Botão de Exclusão (Admin Only) */}
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhotoToDelete({
                                  id: photo.id,
                                  storagePath: photo.storage_path,
                                  fileName: photo.file_name,
                                });
                              }}
                              className="p-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 text-white shadow-md transition-all active:scale-90 min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="Excluir foto permanentemente"
                              aria-label="Excluir foto permanentemente"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                            </button>
                          ) : (
                            <div />
                          )}
                          <Maximize2 className="w-4 h-4 text-white opacity-80" />
                        </div>
                        <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-md w-max border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Nuvem
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Multi-Column Grid */}
              <div className="hidden sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 pt-1">
                {/* 1. Miniaturas Locais Pendentes */}
                {localPreviews.map((prev, index) => (
                  <div
                    key={prev.id}
                    role="button"
                    tabIndex={0}
                    aria-label="Ampliar foto offline pendente"
                    onClick={() => handleOpenLightbox(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenLightbox(index);
                      }
                    }}
                    className="relative aspect-square rounded-2xl overflow-hidden border-2 border-[#ffc61e] bg-zinc-950 shadow-md group cursor-pointer focus-visible:ring-2 focus-visible:ring-[#ffc61e] focus-visible:outline-none"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={prev.url}
                      alt="Preview Foto Offline"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-2.5">
                      <div className="flex justify-between items-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoToDelete({
                              id: prev.id,
                              isOffline: true,
                            });
                          }}
                          className="p-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 text-white shadow-md transition-all active:scale-90 min-h-[32px] min-w-[32px] flex items-center justify-center"
                          title="Remover foto do cofre offline"
                          aria-label="Remover foto do cofre offline"
                        >
                          <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                        </button>
                        <Maximize2 className="w-4 h-4 text-white opacity-80" />
                      </div>
                      <div className="bg-[#ffc61e] text-black text-xs font-extrabold px-2 py-0.5 rounded-md text-center shadow">
                        {isSyncing ? 'Enviando...' : 'Offline'}
                      </div>
                    </div>
                  </div>
                ))}

                {/* 2. Miniaturas Salvas na Nuvem */}
                {registroPhotos.map((photo, index) => {
                  const globalIndex = localPreviews.length + index;
                  return (
                    <div
                      key={photo.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Ampliar foto: ${photo.file_name || 'Foto Oficial'}`}
                      onClick={() => handleOpenLightbox(globalIndex)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpenLightbox(globalIndex);
                        }
                      }}
                      className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-md group cursor-pointer hover:border-[#ffc61e]/70 focus-visible:ring-2 focus-visible:ring-[#ffc61e] focus-visible:outline-none transition-all duration-150"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.public_url}
                        alt={photo.file_name || 'Foto Oficial'}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-2.5">
                        <div className="flex justify-between items-center">
                          {/* Botão de Exclusão (Admin Only) */}
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhotoToDelete({
                                  id: photo.id,
                                  storagePath: photo.storage_path,
                                  fileName: photo.file_name,
                                });
                              }}
                              className="p-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 text-white shadow-md transition-all active:scale-90 min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="Excluir foto permanentemente"
                              aria-label="Excluir foto permanentemente"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                            </button>
                          ) : (
                            <div />
                          )}
                          <Maximize2 className="w-4 h-4 text-white opacity-80" />
                        </div>
                        <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-md w-max border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Nuvem
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-2">
              <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400 font-medium">
                Nenhuma foto registrada para esta obra ainda.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Fullscreen para Gestos Mobile */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={currentSlides}
      />

      {/* Modal de Confirmação de Exclusão (Substitui window.confirm) */}
      <Dialog open={!!photoToDelete} onOpenChange={(open) => !open && setPhotoToDelete(null)}>
        <DialogHeader>
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <DialogTitle>Confirmar Exclusão de Foto</DialogTitle>
          <DialogDescription>
            {photoToDelete?.isOffline
              ? 'Deseja descartar esta foto do cofre offline antes do envio?'
              : 'Tem certeza de que deseja excluir permanentemente esta foto da obra? Esta ação não pode ser desfeita.'}
          </DialogDescription>
        </DialogHeader>

        {deleteErrorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {deleteErrorMessage}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPhotoToDelete(null)}
            disabled={isDeleting}
            className="min-h-[44px] px-4 text-xs font-semibold rounded-xl border-zinc-800 hover:bg-zinc-800 text-zinc-300"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="min-h-[44px] px-4 text-xs font-extrabold rounded-xl bg-red-600 hover:bg-red-700 text-white border-none shadow-md"
          >
            {isDeleting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Excluindo...
              </span>
            ) : (
              'Sim, Excluir Foto'
            )}
          </Button>
        </div>
      </Dialog>
    </Card>
  );
}

