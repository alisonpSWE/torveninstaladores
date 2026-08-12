import { get, set, del } from 'idb-keyval';
import type { Persister, PersistedClient } from '@tanstack/react-query-persist-client';

const IDB_KEY = 'TORVEN_OFFLINE_QUERY_CACHE';

export const indexedDBPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await set(IDB_KEY, client);
  },
  restoreClient: async () => {
    return await get<PersistedClient>(IDB_KEY);
  },
  removeClient: async () => {
    await del(IDB_KEY);
  },
};
