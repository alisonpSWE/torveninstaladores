'use client';

import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePendingMutationCount } from '@/lib/query/mutations';
import { WifiOff, RefreshCw, UploadCloud } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getAllOfflinePhotos,
  removeOfflinePhoto,
  updateOfflinePhotoStatus,
  createRehydratedFile,
} from '@/lib/offline-photo-store';

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncingPhotos, setIsSyncingPhotos] = useState<boolean>(false);
  const [syncingPhotoCount, setSyncingPhotoCount] = useState<number>(0);
  const { pausedCount } = usePendingMutationCount();
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Sincronizador Global de todas as fotos pendentes de todas as obras
  const syncAllPendingPhotos = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    try {
      const allPhotos = await getAllOfflinePhotos();
      if (!allPhotos || allPhotos.length === 0) {
        setIsSyncingPhotos(false);
        setSyncingPhotoCount(0);
        return;
      }

      setIsSyncingPhotos(true);
      setSyncingPhotoCount(allPhotos.length);
      console.log(`[GLOBAL PHOTO SYNC] 🚀 Iniciando sincronização global de ${allPhotos.length} foto(s)...`);

      for (const photo of allPhotos) {
        try {
          await updateOfflinePhotoStatus(photo.id, 'uploading');

          const rawBlob = photo.file || photo.blob;
          if (!rawBlob || rawBlob.size === 0) {
            await removeOfflinePhoto(photo.id);
            continue;
          }

          const safeFile = createRehydratedFile(photo);
          const obraId = Number(photo.id_obra || photo.obraId);
          const storagePath = photo.storagePath || `obra_${obraId}/${photo.timestamp || Date.now()}_${safeFile.name}`;

          const { error: uploadError } = await supabase.storage
            .from('photos')
            .upload(storagePath, safeFile, {
              contentType: safeFile.type,
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from('photos')
            .getPublicUrl(storagePath);

          const insertPayload: any = {
            id_obra: obraId,
            storage_path: storagePath,
            public_url: publicUrlData.publicUrl,
            file_name: safeFile.name,
            content_type: safeFile.type,
            size_bytes: safeFile.size,
            category: photo.category || 'registro',
            subcategory: photo.subcategory || 'geral',
          };

          const { error: dbError } = await (supabase.from('obra_photos' as any) as any).insert(insertPayload);
          if (dbError) throw dbError;

          await removeOfflinePhoto(photo.id);
          console.log(`[GLOBAL PHOTO SYNC] ✅ Foto #${photo.id} (Obra #${obraId}) enviada com sucesso!`);
        } catch (err: any) {
          console.error(`[GLOBAL PHOTO SYNC] ❌ Falha no envio da foto #${photo.id}:`, err?.message || err);
          await updateOfflinePhotoStatus(photo.id, 'failed');
        }
      }

      queryClient.invalidateQueries({ queryKey: ['obras'] });
      queryClient.invalidateQueries({ queryKey: ['obra-photos'] });
      queryClient.invalidateQueries({ queryKey: ['offline-photos'] });
    } catch (globalErr: any) {
      console.error('[GLOBAL PHOTO SYNC] Erro inesperado no sincronizador global:', globalErr);
    } finally {
      setIsSyncingPhotos(false);
      setSyncingPhotoCount(0);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        prefetchAllObras();
        syncAllPendingPhotos();
      };

      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Sincroniza fotos pendentes e cache na inicialização se estiver online
      if (navigator.onLine) {
        prefetchAllObras();
        syncAllPendingPhotos();
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const prefetchAllObras = async () => {
    try {
      await queryClient.prefetchQuery({
        queryKey: ['obras', '', '', undefined, undefined],
        queryFn: async () => {
          const { data } = await supabase
            .from('obras')
            .select('*')
            .order('created_at', { ascending: false });
          return data || [];
        },
      });
    } catch (e) {
      console.warn('Erro ao pré-sincronizar obras:', e);
    }
  };

  if (isOnline && pausedCount === 0 && !isSyncingPhotos) return null;

  return (
    <div className="sticky top-0 z-50 w-full">
      {!isOnline && (
        <div className="bg-amber-500/90 text-black px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-4 h-4" />
            <span>Modo Offline — Exibindo dados em cache</span>
          </div>
          {pausedCount > 0 && (
            <span className="bg-amber-950/20 text-amber-950 px-2 py-0.5 rounded text-[10px] font-mono">
              {pausedCount} pendente(s)
            </span>
          )}
        </div>
      )}

      {isOnline && isSyncingPhotos && (
        <div className="bg-[#ffc61e] text-black px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-1.5">
            <UploadCloud className="w-4 h-4 animate-bounce text-black" />
            <span>Sincronizando {syncingPhotoCount} foto(s) pendente(s) com a nuvem...</span>
          </div>
        </div>
      )}

      {isOnline && !isSyncingPhotos && pausedCount > 0 && (
        <div className="bg-orange-500/90 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Sincronizando {pausedCount} alteração(ões) pendente(s)...</span>
          </div>
        </div>
      )}
    </div>
  );
}
