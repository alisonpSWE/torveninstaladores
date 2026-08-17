'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getAllOfflinePhotos,
  getOfflinePhotosByObra,
  removeOfflinePhoto,
  updateOfflinePhotoStatus,
  createRehydratedFile,
  OfflinePhoto,
} from '@/lib/offline-photo-store';

export interface SyncEngineState {
  isSyncing: boolean;
  pendingCount: number;
  currentPhotoName?: string;
  syncedTotal: number;
  failedTotal: number;
}

type SyncListener = (state: SyncEngineState) => void;

class CentralSyncEngine {
  private isSyncing: boolean = false;
  private listeners: Set<SyncListener> = new Set();
  private networkStabilizationTimer: NodeJS.Timeout | null = null;

  private state: SyncEngineState = {
    isSyncing: false,
    pendingCount: 0,
    syncedTotal: 0,
    failedTotal: 0,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      // Listener de reconexão online com delay de 1500ms para estabilização de rede
      window.addEventListener('online', () => {
        console.log('[SYNC ENGINE] 🌐 Evento online detectado. Aguardando 1500ms para estabilização de rede...');
        this.scheduleStabilizedSync(1500);
      });

      // Listener de visibilidade para sincronizar quando o app volta ao primeiro plano
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          this.scheduleStabilizedSync(500);
        }
      });

      // Listener de foco na janela
      window.addEventListener('focus', () => {
        if (navigator.onLine) {
          this.scheduleStabilizedSync(500);
        }
      });

      // Proteção contra fechamento acidental da aba durante uploads ativos
      window.addEventListener('beforeunload', (e) => {
        if (this.isSyncing) {
          e.preventDefault();
          e.returnValue = 'Há fotos sendo enviadas para a nuvem. Deseja realmente sair?';
          return e.returnValue;
        }
      });
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[SYNC ENGINE] Erro no listener:', err);
      }
    });
  }

  public scheduleStabilizedSync(delayMs: number = 1500) {
    if (this.networkStabilizationTimer) {
      clearTimeout(this.networkStabilizationTimer);
    }
    this.networkStabilizationTimer = setTimeout(() => {
      this.syncAllPendingPhotos();
    }, delayMs);
  }

  /**
   * Executa a sincronização com retry progressivo e mutex atômico
   */
  public async syncAllPendingPhotos(options?: {
    obraId?: number;
    queryClient?: any;
  }): Promise<{ syncedCount: number; failedCount: number }> {
    // 1. MUTEX ATÔMICO: Se já estiver sincronizando, ignora chamadas concorrentes
    if (this.isSyncing) {
      console.log('[SYNC ENGINE] 🔒 Sincronização já em andamento. Chamada concorrente ignorada.');
      return { syncedCount: 0, failedCount: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('[SYNC ENGINE] 📴 Dispositivo offline. Sincronização cancelada.');
      return { syncedCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;
    this.state = { ...this.state, isSyncing: true };
    this.notify();

    let syncedCount = 0;
    let failedCount = 0;
    const supabase = createClient();

    try {
      const targetObraId = options?.obraId;
      const photosToUpload: OfflinePhoto[] = targetObraId
        ? await getOfflinePhotosByObra(targetObraId)
        : await getAllOfflinePhotos();

      if (!photosToUpload || photosToUpload.length === 0) {
        this.isSyncing = false;
        this.state = { ...this.state, isSyncing: false, pendingCount: 0 };
        this.notify();
        return { syncedCount: 0, failedCount: 0 };
      }

      console.log(
        `[SYNC ENGINE] 🚀 Iniciando upload de ${photosToUpload.length} foto(s) ` +
        `${targetObraId ? `para a Obra #${targetObraId}` : 'de todas as obras'}...`
      );

      this.state.pendingCount = photosToUpload.length;
      this.notify();

      for (const photo of photosToUpload) {
        this.state.currentPhotoName = photo.fileName;
        this.notify();

        const success = await this.uploadSinglePhotoWithRetry(photo, supabase, 3);
        if (success) {
          syncedCount++;
        } else {
          failedCount++;
        }
      }

      // Revalidação de Cache do TanStack Query
      if (options?.queryClient) {
        options.queryClient.invalidateQueries({ queryKey: ['obras'] });
        options.queryClient.invalidateQueries({ queryKey: ['obra-photos'] });
        options.queryClient.invalidateQueries({ queryKey: ['offline-photos'] });
      }

      // Dispara evento customizado para reatividade global
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('torven-sync-completed', { detail: { syncedCount, failedCount } }));
      }
    } catch (globalErr: any) {
      console.error('[SYNC ENGINE] ❌ Erro fatal no motor de sincronização:', globalErr);
    } finally {
      this.isSyncing = false;
      this.state = {
        ...this.state,
        isSyncing: false,
        pendingCount: 0,
        currentPhotoName: undefined,
        syncedTotal: this.state.syncedTotal + syncedCount,
        failedTotal: this.state.failedTotal + failedCount,
      };
      this.notify();
    }

    return { syncedCount, failedCount };
  }

  /**
   * Upload de foto individual com até 3 tentativas e backoff progressivo
   */
  private async uploadSinglePhotoWithRetry(
    photo: OfflinePhoto,
    supabase: any,
    maxRetries: number = 3
  ): Promise<boolean> {
    const rawBlob = photo.file || photo.blob;
    if ((!rawBlob || rawBlob.size === 0) && (!photo.buffer || photo.buffer.byteLength === 0)) {
      console.error(`[SYNC ENGINE] ⚠️ Foto #${photo.id} com buffer vazio. Descartando.`);
      await removeOfflinePhoto(photo.id);
      return false;
    }

    // Reidratação segura do buffer com fatia explícita
    const safeFile = createRehydratedFile(photo);
    if (!safeFile || safeFile.size === 0) {
      console.error(`[SYNC ENGINE] ⚠️ Falha ao reidratar foto #${photo.id}.`);
      await removeOfflinePhoto(photo.id);
      return false;
    }

    const obraId = Number(photo.id_obra || photo.obraId || 0);
    const storagePath = photo.storagePath || `obra_${obraId}/${photo.timestamp || Date.now()}_${safeFile.name}`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await updateOfflinePhotoStatus(photo.id, 'uploading');

        console.log(
          `[SYNC ENGINE] 📤 [Tentativa ${attempt}/${maxRetries}] Enviando ${safeFile.name} ` +
          `(${safeFile.size} bytes) para Storage: ${storagePath}...`
        );

        // 1. Upload no Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(storagePath, safeFile, {
            contentType: safeFile.type || 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Storage error: ${uploadError.message}`);
        }

        // 2. Obtenção da URL Pública
        const { data: publicUrlData } = supabase.storage
          .from('photos')
          .getPublicUrl(storagePath);

        const publicUrl = publicUrlData?.publicUrl;

        // 3. Inserção na Tabela obra_photos
        const insertPayload: any = {
          id_obra: obraId,
          storage_path: storagePath,
          public_url: publicUrl,
          file_name: safeFile.name,
          content_type: safeFile.type || 'image/jpeg',
          size_bytes: safeFile.size,
          category: photo.category || 'registro',
          subcategory: photo.subcategory || 'geral',
        };

        const { error: dbError } = await (supabase.from('obra_photos' as any) as any)
          .insert(insertPayload);

        if (dbError) {
          throw new Error(`DB error: ${dbError.message}`);
        }

        // 4. Limpeza no IndexedDB após sucesso
        await removeOfflinePhoto(photo.id);
        console.log(`[SYNC ENGINE] ✅ Foto #${photo.id} (Obra #${obraId}) sincronizada com sucesso!`);
        return true;
      } catch (err: any) {
        console.warn(
          `[SYNC ENGINE] ⚠️ Falha na tentativa ${attempt}/${maxRetries} para a foto #${photo.id}:`,
          err.message || err
        );

        if (attempt < maxRetries) {
          const delay = attempt * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.error(`[SYNC ENGINE] ❌ Todas as ${maxRetries} tentativas falharam para a foto #${photo.id}.`);
          await updateOfflinePhotoStatus(photo.id, 'failed');
        }
      }
    }

    return false;
  }
}

// Singleton global exportado para toda a aplicação
export const syncEngine = new CentralSyncEngine();

/**
 * Hook Reativo para obter o resumo de fotos offline em toda a aplicação
 */
export function usePendingPhotosSummary() {
  const [totalPending, setTotalPending] = useState<number>(0);
  const [pendingByObra, setPendingByObra] = useState<Record<number, number>>({});
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const refreshSummary = useCallback(async () => {
    try {
      const allPhotos = await getAllOfflinePhotos();
      setTotalPending(allPhotos.length);
      const byObra: Record<number, number> = {};
      for (const p of allPhotos) {
        const id = Number(p.id_obra || p.obraId || 0);
        if (id) byObra[id] = (byObra[id] || 0) + 1;
      }
      setPendingByObra(byObra);
    } catch {
      // Ignora erro de leitura em SSR
    }
  }, []);

  useEffect(() => {
    refreshSummary();

    const unsubscribe = syncEngine.subscribe((state) => {
      setIsSyncing(state.isSyncing);
      refreshSummary();
    });

    const interval = setInterval(refreshSummary, 3000);

    const handleOnline = () => {
      setIsOnline(true);
      refreshSummary();
    };

    const handleOffline = () => {
      setIsOnline(false);
      refreshSummary();
    };

    const handleCustomSync = () => {
      refreshSummary();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('torven-sync-completed', handleCustomSync);

    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('torven-sync-completed', handleCustomSync);
    };
  }, [refreshSummary]);

  return {
    totalPending,
    pendingByObra,
    isSyncing,
    isOnline,
    syncAll: () => syncEngine.syncAllPendingPhotos(),
    refetch: refreshSummary,
  };
}
