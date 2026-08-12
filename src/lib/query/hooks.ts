import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Obra } from '@/lib/supabase/types';

export interface UseObrasOptions {
  searchQuery?: string;
  statusFilter?: string;
  allowedStatuses?: string[];
  excludeStatus?: string;
  refetchInterval?: number | false;
}

export function useObras(options: UseObrasOptions | string = '') {
  const searchQuery = typeof options === 'string' ? options : options.searchQuery || '';
  const statusFilter = typeof options === 'string' ? '' : options.statusFilter || '';
  const allowedStatuses = typeof options === 'string' ? undefined : options.allowedStatuses;
  const excludeStatus = typeof options === 'string' ? undefined : options.excludeStatus;
  const refetchInterval = typeof options === 'string' ? 10000 : options.refetchInterval ?? 10000;

  const supabase = createClient();

  return useQuery({
    queryKey: ['obras', searchQuery, statusFilter, allowedStatuses, excludeStatus],
    queryFn: async () => {
      let query = supabase.from('obras').select('*').order('created_at', { ascending: false });

      if (allowedStatuses && allowedStatuses.length > 0) {
        query = query.in('status', allowedStatuses);
      } else if (statusFilter.trim()) {
        query = query.ilike('status', `%${statusFilter.trim()}%`);
      }

      if (excludeStatus?.trim()) {
        query = query.neq('status', excludeStatus.trim());
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const numQ = Number(q);
        if (!isNaN(numQ) && numQ > 0) {
          query = query.or(`cliente.ilike.%${q}%,cidade.ilike.%${q}%,id_obra.eq.${numQ}`);
        } else {
          query = query.or(`cliente.ilike.%${q}%,cidade.ilike.%${q}%`);
        }
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }
      return (data as Obra[]) || [];
    },
    refetchInterval,
    refetchOnWindowFocus: true,
  });
}

export function useObra(idObra: number | string) {
  const supabase = createClient();
  const numId = Number(idObra);

  return useQuery({
    queryKey: ['obra', numId],
    queryFn: async () => {
      if (isNaN(numId)) return null;
      const { data, error } = await supabase
        .from('obras')
        .select('*')
        .eq('id_obra', numId)
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return (data as Obra) || null;
    },
    enabled: !isNaN(numId) && numId > 0,
    refetchOnWindowFocus: true,
  });
}

export function useImportObra() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (idObra: number) => {
      const response = await fetch('/api/import-obra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_obra: idObra }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Falha ao importar obra.');
      }
      return resData.obra as Obra;
    },
    onSuccess: (newObra) => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      if (newObra?.id_obra) {
        queryClient.setQueryData(['obra', newObra.id_obra], newObra);
      }
    },
  });
}

export function useSyncObraWithGroner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (idObra: number) => {
      const response = await fetch('/api/import-obra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [idObra] }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Falha ao sincronizar com o Groner CRM.');
      }
      return resData;
    },
    onSuccess: (_, idObra) => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      queryClient.invalidateQueries({ queryKey: ['obra', idObra] });
    },
  });
}

export function useUpdateObraStatus() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ id_obra, status }: { id_obra: number; status: string }) => {
      const { data, error } = await (supabase.from('obras') as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id_obra', id_obra)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data as Obra;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      if (data?.id_obra) {
        queryClient.setQueryData(['obra', data.id_obra], data);
      }
    },
  });
}

export function useUpdateObraDriveLink() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ id_obra, link_fotos }: { id_obra: number; link_fotos: string | null }) => {
      const { data, error } = await (supabase.from('obras') as any)
        .update({ link_fotos, updated_at: new Date().toISOString() })
        .eq('id_obra', id_obra)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data as Obra;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      if (data?.id_obra) {
        queryClient.setQueryData(['obra', data.id_obra], data);
      }
    },
  });
}

export function useUpdateObraObservacoes() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ id_obra, observacoes }: { id_obra: number; observacoes: string | null }) => {
      const { data, error } = await (supabase.from('obras') as any)
        .update({ observacoes, updated_at: new Date().toISOString() })
        .eq('id_obra', id_obra)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data as Obra;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      if (data?.id_obra) {
        queryClient.setQueryData(['obra', data.id_obra], data);
      }
    },
  });
}
