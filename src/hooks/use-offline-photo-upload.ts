'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { compressImageNative } from '@/lib/image-compressor';
import {
  savePhotoOffline,
  getOfflinePhotosByObra,
  OfflinePhoto,
} from '@/lib/offline-photo-store';
import { syncEngine, SyncEngineState } from '@/lib/sync-engine';

export interface SyncResult {
  syncedCount: number;
  failedCount: number;
  isOnline: boolean;
}

export function useOfflinePhotoUpload(obraId: number) {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [engineState, setEngineState] = useState<SyncEngineState>({
    isSyncing: false,
    pendingCount: 0,
    syncedTotal: 0,
    failedTotal: 0,
  });

  // Subscreve às atualizações de estado do motor central de sincronização
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((state) => {
      setEngineState(state);
    });
    return unsubscribe;
  }, []);

  // Monitora conectividade
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Consulta reativa das fotos pendentes salvas no IndexedDB para a obra atual
  const { data: pendingPhotos = [], refetch: refetchPending } = useQuery<OfflinePhoto[]>({
    queryKey: ['offline-photos', Number(obraId)],
    queryFn: async () => {
      if (!obraId) return [];
      return await getOfflinePhotosByObra(Number(obraId));
    },
    refetchInterval: 3000,
  });

  // Previews locais em Blob URLs para exibição imediata na galeria (com suporte a ArrayBuffer)
  const [localPreviews, setLocalPreviews] = useState<{ id: string; url: string; status: string }[]>([]);

  useEffect(() => {
    if (pendingPhotos && pendingPhotos.length > 0) {
      const previews = pendingPhotos.map((p) => {
        let blobUrl = '';
        try {
          if (p.buffer && p.buffer.byteLength > 0) {
            const blob = new Blob([p.buffer], { type: 'image/jpeg' });
            blobUrl = URL.createObjectURL(blob);
          } else if (p.file || p.blob) {
            const raw = p.file || p.blob;
            blobUrl = URL.createObjectURL(raw);
          }
        } catch {
          blobUrl = '';
        }

        return {
          id: p.id,
          url: blobUrl,
          status: p.status || 'pending',
        };
      });

      setLocalPreviews(previews);

      return () => {
        previews.forEach((prev) => {
          if (prev.url) URL.revokeObjectURL(prev.url);
        });
      };
    } else {
      setLocalPreviews([]);
    }
  }, [pendingPhotos]);

  /**
   * Captura, Comprime via Canvas Nativo e Salva como ArrayBuffer no IndexedDB
   */
  const capturePhoto = useCallback(
    async (file: File): Promise<OfflinePhoto | null> => {
      if (!file || !obraId) return null;

      try {
        console.log(`[USE OFFLINE PHOTO] 📸 Ingestão e compressão da foto para Obra #${obraId}...`);
        const compressed = await compressImageNative(file, file.name);
        const offlineRecord = await savePhotoOffline(
          Number(obraId),
          compressed.buffer,
          compressed.fileName
        );

        queryClient.invalidateQueries({ queryKey: ['offline-photos', Number(obraId)] });
        refetchPending();

        // Se estiver online, agenda sincronização controlada via syncEngine
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          syncEngine.scheduleStabilizedSync(500);
        }

        return offlineRecord;
      } catch (err: any) {
        console.error('[USE OFFLINE PHOTO] Erro ao capturar foto:', err);
        return null;
      }
    },
    [obraId, queryClient, refetchPending]
  );

  /**
   * Dispara a sincronização manual pelo usuário delegando ao SyncEngine central
   */
  const syncOfflinePhotos = useCallback(async (): Promise<SyncResult> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { syncedCount: 0, failedCount: 0, isOnline: false };
    }

    const { syncedCount, failedCount } = await syncEngine.syncAllPendingPhotos({
      obraId: Number(obraId),
      queryClient,
    });

    refetchPending();

    return { syncedCount, failedCount, isOnline: true };
  }, [obraId, queryClient, refetchPending]);

  return {
    capturePhoto,
    syncOfflinePhotos,
    processQueueInForeground: syncOfflinePhotos,
    pendingCount: pendingPhotos.length,
    pendingPhotos,
    localPreviews,
    isOnline,
    isSyncing: engineState.isSyncing,
  };
}
