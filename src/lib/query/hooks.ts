import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Obra } from '@/lib/supabase/types';

export interface UseObrasOptions {
  searchQuery?: string;
  statusFilter?: string; // Ex: "Vistoria Solicitada" para App ou "Documentação em Análise" para Web
}

export function useObras(options: UseObrasOptions | string = '') {
  const searchQuery = typeof options === 'string' ? options : options.searchQuery || '';
  const statusFilter = typeof options === 'string' ? '' : options.statusFilter || '';

  const supabase = createClient();

  return useQuery({
    queryKey: ['obras', searchQuery, statusFilter],
    queryFn: async () => {
      let query = supabase.from('obras').select('*').order('created_at', { ascending: false });

      // Filtro de Single Source of Truth por Status (ex: "Vistoria Solicitada")
      if (statusFilter.trim()) {
        query = query.ilike('status', `%${statusFilter.trim()}%`);
      }

      // Filtro de Busca rápida
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
