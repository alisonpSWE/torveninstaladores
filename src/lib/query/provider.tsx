'use client';

import React, { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { getQueryClient } from './get-query-client';
import { indexedDBPersister } from './idb-persister';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const [unsubscribe, restorePromise] = persistQueryClient({
        queryClient,
        persister: indexedDBPersister,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === 'success',
          shouldDehydrateMutation: () => true,
        },
      });

      restorePromise.then(() => {
        setIsRestored(true);
      });

      return () => {
        unsubscribe();
      };
    } else {
      setIsRestored(true);
    }
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
