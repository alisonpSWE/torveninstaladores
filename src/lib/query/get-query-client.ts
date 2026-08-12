import { QueryClient, isServer, defaultShouldDehydrateQuery } from '@tanstack/react-query';

export const UPDATE_STATUS_MUTATION_KEY = ['obra', 'update-status'];
export const UPDATE_OBS_MUTATION_KEY = ['obra', 'update-observacoes'];

export interface UpdateStatusVars {
  id_obra: number;
  status: string;
}

export interface UpdateObsVars {
  id_obra: number;
  observacoes: string;
}

// API functions chamadas quando online
async function updateStatusApi({ id_obra, status }: UpdateStatusVars) {
  const res = await fetch(`/api/obras/${id_obra}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao atualizar status.');
  }
  return res.json();
}

async function updateObsApi({ id_obra, observacoes }: UpdateObsVars) {
  const res = await fetch(`/api/obras/${id_obra}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ observacoes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao atualizar observações.');
  }
  return res.json();
}

function makeQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 min
        gcTime: 1000 * 60 * 60 * 24 * 7, // 7 dias
        networkMode: 'offlineFirst',
        refetchOnWindowFocus: false,
        retry: 2,
      },
      mutations: {
        networkMode: 'offlineFirst',
        retry: 3,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
        shouldDehydrateMutation: () => true, // Importante: desidrata mutações pendentes/pausadas
      },
    },
  });

  // Registra os defaults para rebind do mutationFn ao restaurar do IndexedDB
  queryClient.setMutationDefaults(UPDATE_STATUS_MUTATION_KEY, {
    mutationFn: updateStatusApi as any,
    networkMode: 'offlineFirst',
  });

  queryClient.setMutationDefaults(UPDATE_OBS_MUTATION_KEY, {
    mutationFn: updateObsApi as any,
    networkMode: 'offlineFirst',
  });

  return queryClient;
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
