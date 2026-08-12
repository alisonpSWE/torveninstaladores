import { useMutation, useQueryClient, useMutationState } from '@tanstack/react-query';
import {
  UPDATE_STATUS_MUTATION_KEY,
  UPDATE_OBS_MUTATION_KEY,
  UpdateStatusVars,
  UpdateObsVars,
} from './get-query-client';
import { Obra } from '@/lib/supabase/types';

export interface UpdateDriveLinkVars {
  id_obra: number;
  link_fotos: string;
}

export function useUpdateObraStatus() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, UpdateStatusVars, { previousObra?: Obra }>({
    mutationKey: UPDATE_STATUS_MUTATION_KEY,
    networkMode: 'offlineFirst',
    onMutate: async ({ id_obra, status }) => {
      const queryKey = ['obra', id_obra];
      await queryClient.cancelQueries({ queryKey });

      const previousObra = queryClient.getQueryData<Obra>(queryKey);

      if (previousObra) {
        queryClient.setQueryData<Obra>(queryKey, {
          ...previousObra,
          status,
        });
      }

      queryClient.setQueryData<Obra[]>(['obras', ''], (old) =>
        old
          ? old.map((item) => (item.id_obra === id_obra ? { ...item, status } : item))
          : []
      );

      return { previousObra };
    },
    onError: (err, { id_obra }, context) => {
      if (context?.previousObra) {
        queryClient.setQueryData(['obra', id_obra], context.previousObra);
      }
    },
    onSettled: (data, error, { id_obra }) => {
      queryClient.invalidateQueries({ queryKey: ['obra', id_obra] });
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}

export function useUpdateObraObservacoes() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, UpdateObsVars, { previousObra?: Obra }>({
    mutationKey: UPDATE_OBS_MUTATION_KEY,
    networkMode: 'offlineFirst',
    onMutate: async ({ id_obra, observacoes }) => {
      const queryKey = ['obra', id_obra];
      await queryClient.cancelQueries({ queryKey });

      const previousObra = queryClient.getQueryData<Obra>(queryKey);

      if (previousObra) {
        queryClient.setQueryData<Obra>(queryKey, {
          ...previousObra,
          observacoes,
        });
      }

      return { previousObra };
    },
    onError: (err, { id_obra }, context) => {
      if (context?.previousObra) {
        queryClient.setQueryData(['obra', id_obra], context.previousObra);
      }
    },
    onSettled: (data, error, { id_obra }) => {
      queryClient.invalidateQueries({ queryKey: ['obra', id_obra] });
    },
  });
}

export function useUpdateObraDriveLink() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, UpdateDriveLinkVars, { previousObra?: Obra }>({
    mutationKey: ['obra', 'update-drive-link'],
    networkMode: 'offlineFirst',
    onMutate: async ({ id_obra, link_fotos }) => {
      const queryKey = ['obra', id_obra];
      await queryClient.cancelQueries({ queryKey });

      const previousObra = queryClient.getQueryData<Obra>(queryKey);

      if (previousObra) {
        queryClient.setQueryData<Obra>(queryKey, {
          ...previousObra,
          link_fotos,
        });
      }

      return { previousObra };
    },
    onError: (err, { id_obra }, context) => {
      if (context?.previousObra) {
        queryClient.setQueryData(['obra', id_obra], context.previousObra);
      }
    },
    onSettled: (data, error, { id_obra }) => {
      queryClient.invalidateQueries({ queryKey: ['obra', id_obra] });
    },
  });
}

/**
 * Hook de Mutação de Pânico (Sincronização Manual Direta com CRM Groner)
 * Reutiliza /api/import-obra para re-executar ETL e upsert no Supabase
 */
export function useSyncObraWithGroner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['obra', 'sync-groner'],
    mutationFn: async (id_obra: number) => {
      const response = await fetch('/api/import-obra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_obra }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Falha ao sincronizar com o CRM Groner.');
      }
      return resData.obra as Obra;
    },
    onSettled: (data, error, id_obra) => {
      queryClient.invalidateQueries({ queryKey: ['obra', id_obra] });
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}

export function usePendingMutationCount() {
  const pendingMutations = useMutationState({
    filters: { status: 'pending' },
    select: (mutation) => mutation.state.isPaused,
  });

  return {
    totalPending: pendingMutations.length,
    pausedCount: pendingMutations.filter(Boolean).length,
  };
}
