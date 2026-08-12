'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  savePendingPhoto,
  getPendingPhotos,
  removePendingPhoto,
  getPendingPhotoCount,
  PendingPhoto,
} from '@/lib/offline-photo-store';
import { createClient } from '@/lib/supabase/client';

export function useOfflinePhotoUpload(obraId: number) {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [localPreviews, setLocalPreviews] = useState<{ id: string; url: string }[]>([]);

  const updatePendingCount = useCallback(async () => {
    const photos = await getPendingPhotos();
    const obraPhotos = photos.filter((p) => p.obraId === obraId);
    setPendingCount(obraPhotos.length);

    // Previews locais
    const previews = obraPhotos.map((p) => ({
      id: p.id,
      url: URL.createObjectURL(p.blob),
    }));
    setLocalPreviews(previews);
  }, [obraId]);

  // Upload em primeiro plano (iOS fallback ou gatilho online)
  const processQueueInForeground = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    const photos = await getPendingPhotos();
    const obraPhotos = photos.filter((p) => p.obraId === obraId);
    if (obraPhotos.length === 0) return;

    setIsSyncing(true);
    const supabase = createClient();

    for (const photo of obraPhotos) {
      try {
        const { error } = await supabase.storage
          .from(photo.bucket)
          .upload(photo.storagePath, photo.blob, {
            contentType: photo.contentType,
            upsert: true,
          });

        if (!error) {
          await removePendingPhoto(photo.id);
        }
      } catch (err) {
        console.error('Erro ao enviar foto em primeiro plano:', photo.id, err);
      }
    }

    await updatePendingCount();
    setIsSyncing(false);
  }, [isSyncing, obraId, updatePendingCount]);

  // Salva no IndexedDB e dispara Background Sync ou Fallback Foreground
  const capturePhoto = useCallback(
    async (file: File, bucket: string = 'photos') => {
      const timestamp = Date.now();
      const storagePath = `obra_${obraId}/${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const pendingPhoto: PendingPhoto = {
        id: `photo_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
        blob: file,
        fileName: file.name,
        contentType: file.type || 'image/jpeg',
        bucket,
        storagePath,
        obraId,
        createdAt: timestamp,
      };

      // 1. Salva no IndexedDB
      await savePendingPhoto(pendingPhoto);
      await updatePendingCount();

      // 2. Tenta a Background Sync API (Android / Chromium)
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await (registration as any).sync.register('sync-photos');
          return;
        } catch (syncErr) {
          console.warn('Background sync falhou, usando fallback em primeiro plano:', syncErr);
        }
      }

      // 3. Fallback (iOS Safari / navegadores sem SyncManager)
      if (navigator.onLine) {
        await processQueueInForeground();
      }
    },
    [obraId, processQueueInForeground, updatePendingCount]
  );

  useEffect(() => {
    updatePendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      processQueueInForeground();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        processQueueInForeground();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [processQueueInForeground, updatePendingCount]);

  return {
    capturePhoto,
    pendingCount,
    isOnline,
    isSyncing,
    localPreviews,
    processQueueInForeground,
  };
}
