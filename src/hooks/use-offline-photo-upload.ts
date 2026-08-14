'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/image-compressor';
import {
  savePhotoOffline,
  getOfflinePhotosByObra,
  removeOfflinePhoto,
  updateOfflinePhotoStatus,
  OfflinePhoto,
} from '@/lib/offline-photo-store';

export interface SyncResult {
  syncedCount: number;
  failedCount: number;
  isOnline: boolean;
}

export function useOfflinePhotoUpload(obraId: number) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Consulta reativa das fotos pendentes salvas no IndexedDB para a obra atual
  const { data: pendingPhotos = [], refetch: refetchPending } = useQuery<OfflinePhoto[]>({
    queryKey: ['offline-photos', Number(obraId)],
    queryFn: async () => {
      if (!obraId) return [];
      return await getOfflinePhotosByObra(Number(obraId));
    },
    refetchInterval: 4000,
  });

  // Previews locais em Blob URLs para exibição imediata na galeria
  const [localPreviews, setLocalPreviews] = useState<{ id: string; url: string; status: string }[]>([]);

  useEffect(() => {
    if (pendingPhotos && pendingPhotos.length > 0) {
      const previews = pendingPhotos.map((p) => ({
        id: p.id,
        url: URL.createObjectURL(p.file || p.blob),
        status: p.status || 'pending',
      }));
      setLocalPreviews(previews);

      return () => {
        previews.forEach((prev) => URL.revokeObjectURL(prev.url));
      };
    } else {
      setLocalPreviews([]);
    }
  }, [pendingPhotos]);

  /**
   * Captura, Comprime e Salva uma foto localmente no IndexedDB
   */
  const capturePhoto = useCallback(
    async (file: File): Promise<OfflinePhoto | null> => {
      if (!file || !obraId) return null;

      try {
        console.log(`[USE OFFLINE PHOTO] 📸 Capturando e comprimindo foto para Obra #${obraId}...`);
        const compressedFile = await compressImage(file);
        const offlineRecord = await savePhotoOffline(Number(obraId), compressedFile, file.name);

        queryClient.invalidateQueries({ queryKey: ['offline-photos', Number(obraId)] });
        refetchPending();

        // Se estiver online, aciona a sincronização imediata em segundo plano
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          setTimeout(() => {
            syncOfflinePhotos();
          }, 300);
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
   * FLUXO ESTRITO DE SINCRONIZAÇÃO OFFLINE-FIRST:
   * 1. Verifica conectividade (se offline, aborta silenciosamente)
   * 2. Busca fotos pendentes no IndexedDB
   * 3. Para cada foto: Upload no Storage ➔ Resgate da URL Pública ➔ Insert na tabela obra_photos ➔ Limpeza do IndexedDB
   * 4. Invalida as queries do TanStack para a UI atualizar instantaneamente
   */
  const syncOfflinePhotos = useCallback(async (): Promise<SyncResult> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('[OFFLINE PHOTO SYNC] 📴 Dispositivo offline. Sincronização adiada.');
      setIsOnline(false);
      return { syncedCount: 0, failedCount: 0, isOnline: false };
    }

    setIsOnline(true);

    const photosToUpload = await getOfflinePhotosByObra(Number(obraId));
    if (!photosToUpload || photosToUpload.length === 0) {
      return { syncedCount: 0, failedCount: 0, isOnline: true };
    }

    setIsSyncing(true);
    let syncedCount = 0;
    let failedCount = 0;

    console.log(
      `[OFFLINE PHOTO SYNC] 🚀 Iniciando sincronização de ${photosToUpload.length} foto(s) ` +
      `para a Obra #${obraId}...`
    );

    for (const photo of photosToUpload) {
      try {
        await updateOfflinePhotoStatus(photo.id, 'uploading');

        const fileBlob = photo.file || photo.blob;
        if (!fileBlob) {
          console.warn(`[OFFLINE PHOTO SYNC] ⚠️ Foto #${photo.id} sem Blob válido. Deletando do IndexedDB.`);
          await removeOfflinePhoto(photo.id);
          continue;
        }

        const fileNameClean = (photo.fileName || `foto_${Date.now()}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = photo.storagePath || `obra_${obraId}/${photo.timestamp || Date.now()}_${fileNameClean}`;

        // 1. UPLOAD NO SUPABASE STORAGE (Bucket 'photos')
        console.log(`[OFFLINE PHOTO SYNC] 📤 Enviando para Storage: ${storagePath}...`);
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(storagePath, fileBlob, {
            contentType: photo.contentType || 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Erro no Supabase Storage: ${uploadError.message}`);
        }

        // 2. RESGATE DA URL PÚBLICA
        const { data: publicUrlData } = supabase.storage
          .from('photos')
          .getPublicUrl(storagePath);

        const publicUrl = publicUrlData.publicUrl;

        // 3. INSERÇÃO NA TABELA obra_photos NO SUPABASE
        console.log(`[OFFLINE PHOTO SYNC] 💾 Registrando metadados na tabela obra_photos...`);
        const insertPayload: any = {
          id_obra: Number(obraId),
          storage_path: storagePath,
          public_url: publicUrl,
          file_name: photo.fileName || fileNameClean,
          content_type: photo.contentType || 'image/jpeg',
          size_bytes: fileBlob.size || 0,
        };

        const { error: dbError } = await supabase
          .from('obra_photos')
          .insert(insertPayload);

        if (dbError) {
          throw new Error(`Erro na tabela obra_photos: ${dbError.message}`);
        }

        // 4. LIMPEZA DO INDEXEDDB (Somente após sucesso absoluto no DB)
        await removeOfflinePhoto(photo.id);
        syncedCount++;

        console.log(`[OFFLINE PHOTO SYNC] ✅ Foto #${photo.id} sincronizada e removida do cache local!`);
      } catch (err: any) {
        failedCount++;
        console.error(`[OFFLINE PHOTO SYNC] ❌ Falha no upload da foto #${photo.id}:`, err.message || err);
        await updateOfflinePhotoStatus(photo.id, 'failed');
      }
    }

    setIsSyncing(false);

    // 5. INVALIDAÇÃO DE QUERIES DO TANSTACK QUERY
    queryClient.invalidateQueries({ queryKey: ['obra-photos', Number(obraId)] });
    queryClient.invalidateQueries({ queryKey: ['offline-photos', Number(obraId)] });
    refetchPending();

    return { syncedCount, failedCount, isOnline: true };
  }, [obraId, queryClient, refetchPending, supabase]);

  // Listener de reconexão online e visibilidade de tela (Background Sync Fallback)
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflinePhotos();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        syncOfflinePhotos();
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
  }, [syncOfflinePhotos]);

  return {
    capturePhoto,
    syncOfflinePhotos,
    processQueueInForeground: syncOfflinePhotos, // Alias para retrocompatibilidade
    pendingCount: pendingPhotos.length,
    pendingPhotos,
    localPreviews,
    isOnline,
    isSyncing,
  };
}
