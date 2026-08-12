'use client';

import React, { ChangeEvent } from 'react';
import { useOfflinePhotoUpload } from '@/hooks/use-offline-photo-upload';
import { Camera, Upload, ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PhotoCaptureProps {
  obraId: number;
}

export function PhotoCapture({ obraId }: PhotoCaptureProps) {
  const {
    capturePhoto,
    pendingCount,
    isOnline,
    isSyncing,
    localPreviews,
    processQueueInForeground,
  } = useOfflinePhotoUpload(obraId);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await capturePhoto(file);
    e.target.value = ''; // reseta input
  };

  return (
    <Card className="p-4 border-zinc-800 bg-zinc-900/90 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-orange-400" /> Registro Fotográfico da Obra
        </span>
        {pendingCount > 0 && (
          <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md font-mono">
            {pendingCount} foto(s) offline
          </span>
        )}
      </div>

      {/* Grid de Previews locais/offline */}
      {localPreviews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 pt-1">
          {localPreviews.map((prev) => (
            <div
              key={prev.id}
              className="relative aspect-square rounded-xl overflow-hidden border border-amber-500/40 bg-zinc-950 group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={prev.url}
                alt="Preview da foto tirada"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-[9px] font-bold text-amber-300 bg-black/70 px-1.5 py-0.5 rounded">
                  Pendente
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botão para Acionar Câmera Nativa */}
      <label className="block w-full cursor-pointer">
        <div className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 active:scale-[0.99] transition-all">
          <Camera className="w-5 h-5" />
          <span>Tirar Foto com a Câmera</span>
        </div>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {/* Indicador de fotos pendentes de envio com botão de Sync */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Upload className="w-4 h-4 text-amber-400" />
            )}
            <span>
              {isSyncing
                ? 'Enviando fotos...'
                : `${pendingCount} foto(s) aguardando conexão`}
            </span>
          </div>

          {isOnline && !isSyncing && (
            <Button
              size="sm"
              variant="outline"
              onClick={processQueueInForeground}
              className="h-7 text-xs bg-amber-500/20 border-amber-500/40 text-amber-200 hover:bg-amber-500/30"
            >
              Enviar Agora
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
