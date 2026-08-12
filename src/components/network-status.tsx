'use client';

import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePendingMutationCount } from '@/lib/query/mutations';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const { pausedCount } = usePendingMutationCount();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        // Pre-sync silencioso das obras ao reconectar
        prefetchAllObras();
      };

      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Pre-sync inicial na montagem se estiver online
      if (navigator.onLine) {
        prefetchAllObras();
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const prefetchAllObras = async () => {
    try {
      const supabase = createClient();
      await queryClient.prefetchQuery({
        queryKey: ['obras', ''],
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

  if (isOnline && pausedCount === 0) return null;

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

      {isOnline && pausedCount > 0 && (
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
