'use client';

import React, { useState, ChangeEvent } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { useOfflinePhotoUpload } from '@/hooks/use-offline-photo-upload';
import { useObraPhotos } from '@/lib/query/hooks';
import { ProjectPhotoDropzone } from './project-photo-dropzone';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PhotoGalleryProps {
  obraId: number;
}

export function PhotoGallery({ obraId }: PhotoGalleryProps) {
  const [activeTab, setActiveTab] = useState<'registro' | 'projeto'>('registro');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Motor offline e upload para instaladores (Campo)
  const {
    capturePhoto,
    syncOfflinePhotos,
    pendingCount,
    localPreviews,
    isOnline,
    isSyncing,
  } = useOfflinePhotoUpload(obraId);

  // Fotos oficiais do Supabase separadas por categoria (registro vs projeto)
  const { data: photosData, isLoading: isLoadingPhotos } = useObraPhotos(obraId);
  const registroPhotos = photosData?.registroPhotos || [];
  const projetoPhotos = photosData?.projetoPhotos || [];

  // Captura foto da câmera nativa
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await capturePhoto(file);
    e.target.value = '';
  };

  // Consolidação dinâmica dos slides para o Lightbox baseada na Aba Ativa
  const currentSlides = activeTab === 'registro'
    ? [
        ...localPreviews.map((prev) => ({ src: prev.url, alt: 'Foto Local Pendente' })),
        ...registroPhotos.map((photo) => ({ src: photo.public_url, alt: photo.file_name || 'Foto de Campo' })),
      ]
    : projetoPhotos.map((photo) => ({ src: photo.public_url, alt: photo.file_name || 'Foto do Projeto' }));

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
      {/* ABA 'PROJETO' (Upload Back-Office + Responsive Grid / Carrossel Scroll-Snap) */}
      {/* ========================================================================= */}
      {activeTab === 'projeto' && (
        <div className="space-y-4">
          {/* Componente de Drag & Drop para Back-Office */}
          <ProjectPhotoDropzone obraId={obraId} />

          {/* Fotos do Projeto */}
          {projetoPhotos.length > 0 ? (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-[#ffc61e]" /> Arquivos de Projeto ({projetoPhotos.length})
                </span>
                <span className="text-[11px] text-zinc-500 hidden sm:inline">Clique para ampliar</span>
                <span className="text-[11px] text-zinc-500 sm:hidden">Deslize para o lado ➔</span>
              </div>

              {/* Mobile: Scroll-Snap Carousel | Desktop: Responsive Grid */}
              <div className="sm:hidden flex overflow-x-auto gap-3 snap-x snap-mandatory pb-3 pt-1 no-scrollbar scroll-smooth">
                {projetoPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    onClick={() => handleOpenLightbox(index)}
                    className="relative w-36 h-36 shrink-0 snap-center rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-md group cursor-pointer hover:border-[#ffc61e]/70 transition-all duration-150"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.public_url}
                      alt={photo.file_name || 'Foto do Projeto'}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-2.5">
                      <div className="flex justify-end">
                        <Maximize2 className="w-4 h-4 text-white opacity-80" />
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-200 font-bold bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md truncate border border-zinc-700/60">
                        <Folder className="w-3 h-3 text-[#ffc61e] shrink-0" />
                        <span className="truncate">{photo.file_name || 'Projeto'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 pt-1">
                {projetoPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    onClick={() => handleOpenLightbox(index)}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-md group cursor-pointer hover:border-[#ffc61e]/70 transition-all duration-150"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.public_url}
                      alt={photo.file_name || 'Foto do Projeto'}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-2.5">
                      <div className="flex justify-end">
                        <Maximize2 className="w-4 h-4 text-white opacity-80" />
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-200 font-bold bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md truncate border border-zinc-700/60">
                        <Folder className="w-3 h-3 text-[#ffc61e] shrink-0" />
                        <span className="truncate">{photo.file_name || 'Projeto'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-2">
              <Folder className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400 font-medium">Nenhum arquivo de projeto enviado para esta obra.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 'REGISTRO' (Campo Instaladores PWA - Captura Câmera Nativa) */}
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
          {(localPreviews.length > 0 || registroPhotos.length > 0) ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#ffc61e]" /> Galeria de Campo ({localPreviews.length + registroPhotos.length})
                </span>
                <span className="text-[11px] text-zinc-500 hidden sm:inline">Clique para ampliar</span>
                <span className="text-[11px] text-zinc-500 sm:hidden">Deslize para o lado ➔</span>
              </div>

              {/* Mobile Scroll-Snap Carousel */}
              <div className="sm:hidden flex overflow-x-auto gap-3 snap-x snap-mandatory pb-3 pt-1 no-scrollbar scroll-smooth">
                {/* 1. Miniaturas Locais Pendentes */}
                {localPreviews.map((prev, index) => (
                  <div
                    key={prev.id}
                    onClick={() => handleOpenLightbox(index)}
                    className="relative w-36 h-36 shrink-0 snap-center rounded-2xl overflow-hidden border-2 border-[#ffc61e] bg-zinc-950 shadow-md group cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={prev.url}
                      alt="Preview Foto Offline"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-2.5">
                      <div className="flex justify-end">
                        <Maximize2 className="w-4 h-4 text-white opacity-80" />
                      </div>
                      <div className="bg-[#ffc61e] text-black text-[10px] font-extrabold px-2 py-0.5 rounded-md text-center shadow">
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
                      onClick={() => handleOpenLightbox(globalIndex)}
                      className="relative w-36 h-36 shrink-0 snap-center rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-md group cursor-pointer hover:border-[#ffc61e]/70 transition-all duration-150"
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
                        <div className="flex justify-end">
                          <Maximize2 className="w-4 h-4 text-white opacity-80" />
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-md w-max border border-emerald-500/30">
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
                    onClick={() => handleOpenLightbox(index)}
                    className="relative aspect-square rounded-2xl overflow-hidden border-2 border-[#ffc61e] bg-zinc-950 shadow-md group cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={prev.url}
                      alt="Preview Foto Offline"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-2.5">
                      <div className="flex justify-end">
                        <Maximize2 className="w-4 h-4 text-white opacity-80" />
                      </div>
                      <div className="bg-[#ffc61e] text-black text-[10px] font-extrabold px-2 py-0.5 rounded-md text-center shadow">
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
                      onClick={() => handleOpenLightbox(globalIndex)}
                      className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-md group cursor-pointer hover:border-[#ffc61e]/70 transition-all duration-150"
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
                        <div className="flex justify-end">
                          <Maximize2 className="w-4 h-4 text-white opacity-80" />
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-md w-max border border-emerald-500/30">
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
              <p className="text-xs text-zinc-400 font-medium">Nenhuma foto registrada para esta obra ainda.</p>
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
    </Card>
  );
}
