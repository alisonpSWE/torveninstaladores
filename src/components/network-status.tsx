'use client';

import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePendingMutationCount } from '@/lib/query/mutations';
import { WifiOff, RefreshCw, UploadCloud } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { syncEngine, SyncEngineState } from '@/lib/sync-engine';

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [engineState, setEngineState] = useState<SyncEngineState>({
    isSyncing: false,
    pendingCount: 0,
    syncedTotal: 0,
    failedTotal: 0,
  });

  const { pausedCount } = usePendingMutationCount();
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        prefetchAllObras();
      };

      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      if (navigator.onLine) {
        prefetchAllObras();
      }

      // Subscreve ao estado do motor central de sincronização
      const unsubscribe = syncEngine.subscribe((state) => {
        setEngineState(state);
      });

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        unsubscribe();
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

  if (isOnline && pausedCount === 0 && !engineState.isSyncing) return null;

  return (
    <div className="sticky top-0 z-50 w-full">
      {/* Banner de Modo Offline */}
      {!isOnline && (
        <div className="bg-amber-500/90 text-black px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-4 h-4" />
            <span>Modo Offline — Exibindo dados em cache local</span>
          </div>
          {pausedCount > 0 && (
            <span className="bg-amber-950/20 text-amber-950 px-2 py-0.5 rounded text-[10px] font-mono">
              {pausedCount} pendente(s)
            </span>
          )}
        </div>
      )}

      {/* Banner de Sincronização de Fotos com a Nuvem */}
      {isOnline && engineState.isSyncing && (
        <div className="bg-[#ffc61e] text-black px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-black animate-bounce" />
            <span>
              Sincronizando fotos com a nuvem...
              {engineState.pendingCount > 0 && ` (${engineState.pendingCount} restantes)`}
            </span>
          </div>
          {engineState.currentPhotoName && (
            <span className="text-[10px] font-mono text-black/70 truncate max-w-xs hidden sm:inline">
              {engineState.currentPhotoName}
            </span>
          )}
        </div>
      )}

      {/* Banner de Sincronização de Mutações de Dados */}
      {isOnline && !engineState.isSyncing && pausedCount > 0 && (
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
