'use client';

import React, { ChangeEvent } from 'react';
import { useOfflinePhotoUpload } from '@/hooks/use-offline-photo-upload';
import { Camera, Upload, ImageIcon, Loader2 } from 'lucide-react';
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
          <ImageIcon className="w-4 h-4 text-[#ffc61e]" /> Registro Fotográfico da Obra
        </span>
        {pendingCount > 0 && (
          <span className="text-xs bg-[#ffc61e]/15 text-[#ffc61e] border border-[#ffc61e]/30 px-2 py-0.5 rounded-md font-mono font-bold">
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
              className="relative aspect-square rounded-xl overflow-hidden border border-[#ffc61e]/40 bg-zinc-950 group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={prev.url}
                alt="Preview da foto tirada"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-xs font-extrabold text-black bg-[#ffc61e] px-2 py-0.5 rounded shadow">
                  Pendente
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botão para Acionar Câmera Nativa em Alto Contraste 14:1 */}
      <label className="block w-full cursor-pointer">
        <div className="w-full h-12 rounded-xl bg-[#ffc61e] hover:bg-[#e5b010] text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-md border border-[#ffc61e]/40 active:scale-[0.99] transition-all">
          <Camera className="w-5 h-5 stroke-[2.5]" />
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
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#ffc61e]/10 border border-[#ffc61e]/30 text-xs text-[#ffc61e]">
          <div className="flex items-center gap-2">
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#ffc61e]" />
            ) : (
              <Upload className="w-4 h-4 text-[#ffc61e]" />
            )}
            <span className="font-semibold">
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
              className="h-8 text-xs bg-[#ffc61e] text-black hover:bg-[#e5b010] font-bold border-none"
            >
              Enviar Agora
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
