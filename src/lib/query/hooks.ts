import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  Obra,
  ObraPhoto,
  Perfil,
  EstoqueProduto,
  ObraMaterialComProduto,
} from '@/lib/supabase/types';
import { deleteObraPhoto, DeletePhotoParams } from '@/lib/actions/delete-photo';

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

export function usePerfil() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['perfil-usuario'],
    queryFn: async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return null;
      }

      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.warn('Perfil do usuário não encontrado:', error.message);
        return null;
      }

      return data as Perfil;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });
}

export function useObra(idObra: number | string) {
  const numId = Number(idObra);
  const supabase = createClient();

  return useQuery({
    queryKey: ['obra', numId],
    queryFn: async () => {
      if (!numId) return null;

      const { data, error } = await supabase
        .from('obras')
        .select('*')
        .eq('id_obra', numId)
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data as Obra;
    },
    enabled: !!numId,
  });
}

export function useObraPhotos(idObra: number | string) {
  const numId = Number(idObra);
  const supabase = createClient();

  return useQuery({
    queryKey: ['obra-photos', numId],
    queryFn: async () => {
      if (!numId) return { registroPhotos: [], projetoPhotos: [], projetoPhotosBySubcategory: {}, allPhotos: [] };

      const { data, error } = await supabase
        .from('obra_photos' as any)
        .select('*')
        .eq('id_obra', numId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const all = (data as unknown as ObraPhoto[]) || [];
      const registro = all.filter((p) => p.category === 'registro' || !p.category);
      const projeto = all.filter((p) => p.category === 'projeto');

      const bySubcat: Record<string, ObraPhoto[]> = {};
      projeto.forEach((photo) => {
        const sub = photo.subcategory || 'geral';
        if (!bySubcat[sub]) {
          bySubcat[sub] = [];
        }
        bySubcat[sub].push(photo);
      });

      return {
        registroPhotos: registro,
        projetoPhotos: projeto,
        projetoPhotosBySubcategory: bySubcat,
        allPhotos: all,
      };
    },
    enabled: !!numId,
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DeletePhotoParams) => {
      return await deleteObraPhoto(params);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['obra-photos', Number(variables.idObra)] });
      queryClient.invalidateQueries({ queryKey: ['offline-photos', Number(variables.idObra)] });
    },
  });
}

export function useImportObra() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (idObra: number) => {
      const response = await fetch('/api/webhooks/groner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_obra: idObra }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Falha ao importar obra #${idObra}`);
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}

export function useSyncObraWithGroner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (idObra: number) => {
      const response = await fetch(`/api/obras/${idObra}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Erro ao sincronizar com o Groner para a obra #${idObra}`);
      }

      return await response.json();
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

// ============================================================================
// HOOKS: GESTÃO DE ESTOQUE E CONSUMO DE MATERIAIS
// ============================================================================

export function useEstoqueProdutos() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['estoque-produtos'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('estoque_produtos') as any)
        .select('*')
        .order('categoria')
        .order('nome');

      if (error) {
        throw new Error(error.message);
      }
      return (data as EstoqueProduto[]) || [];
    },
    refetchInterval: 10000,
  });
}

export function useObraMateriais(idObra: number | string) {
  const numId = Number(idObra);
  const supabase = createClient();

  return useQuery({
    queryKey: ['obra-materiais', numId],
    queryFn: async () => {
      if (!numId) return [];

      const { data, error } = await (supabase.from('obra_materiais') as any)
        .select('*, produto:estoque_produtos(*), perfil:perfis(*)')
        .eq('id_obra', numId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      return (data as ObraMaterialComProduto[]) || [];
    },
    enabled: !!numId,
    refetchInterval: 10000,
  });
}

export function useEstoqueKardex(idProduto?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['estoque-kardex', idProduto],
    queryFn: async () => {
      if (!idProduto) return [];

      const { data, error } = await (supabase.from('obra_materiais') as any)
        .select('*, obra:obras(*), perfil:perfis(*)')
        .eq('id_produto', idProduto)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      return (data as ObraMaterialComProduto[]) || [];
    },
    enabled: !!idProduto,
  });
}

export function useRegistrarMaterial() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      id_obra,
      id_produto,
      quantidade_utilizada,
      observacoes,
    }: {
      id_obra: number;
      id_produto: string;
      quantidade_utilizada: number;
      observacoes?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await (supabase.from('obra_materiais') as any)
        .insert({
          id_obra,
          id_produto,
          quantidade_utilizada,
          observacoes: observacoes || null,
          registrado_por: user?.id || null,
        })
        .select('*, produto:estoque_produtos(*)')
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['obra-materiais', variables.id_obra] });
      queryClient.invalidateQueries({ queryKey: ['estoque-produtos'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-kardex'] });
    },
  });
}

export function useDeleteObraMaterial() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ id, id_obra }: { id: string; id_obra: number }) => {
      const { error } = await (supabase.from('obra_materiais') as any)
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['obra-materiais', variables.id_obra] });
      queryClient.invalidateQueries({ queryKey: ['estoque-produtos'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-kardex'] });
    },
  });
}

export function useCreateEstoqueProduto() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (novoProduto: {
      codigo: string;
      nome: string;
      categoria: string;
      unidade: string;
      quantidade_saldo: number;
      estoque_minimo: number;
      localizacao?: string;
    }) => {
      const { data, error } = await (supabase.from('estoque_produtos') as any)
        .insert(novoProduto)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data as EstoqueProduto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque-produtos'] });
    },
  });
}

export function useUpdateEstoqueSaldo() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      id,
      quantidade_saldo,
      estoque_minimo,
      localizacao,
    }: {
      id: string;
      quantidade_saldo: number;
      estoque_minimo?: number;
      localizacao?: string;
    }) => {
      const payload: any = { quantidade_saldo };
      if (estoque_minimo !== undefined) {
        payload.estoque_minimo = estoque_minimo;
      }
      if (localizacao !== undefined) {
        payload.localizacao = localizacao;
      }

      const { data, error } = await (supabase.from('estoque_produtos') as any)
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data as EstoqueProduto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque-produtos'] });
    },
  });
}

export function useQuickAdjustSaldo() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ id, delta, motivo }: { id: string; delta: number; motivo?: string }) => {
      // Busca produto atual
      const { data: prod, error: fetchErr } = await (supabase.from('estoque_produtos') as any)
        .select('quantidade_saldo')
        .eq('id', id)
        .single();

      if (fetchErr || !prod) {
        throw new Error(fetchErr?.message || 'Produto não encontrado.');
      }

      const novoSaldo = Math.max(0, Number(prod.quantidade_saldo || 0) + delta);

      const { data, error } = await (supabase.from('estoque_produtos') as any)
        .update({ quantidade_saldo: novoSaldo })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data as EstoqueProduto;
    },
    onMutate: async ({ id, delta }) => {
      await queryClient.cancelQueries({ queryKey: ['estoque-produtos'] });
      const previous = queryClient.getQueryData<EstoqueProduto[]>(['estoque-produtos']);

      if (previous) {
        queryClient.setQueryData<EstoqueProduto[]>(
          ['estoque-produtos'],
          previous.map((p) =>
            p.id === id
              ? { ...p, quantidade_saldo: Math.max(0, Number(p.quantidade_saldo || 0) + delta) }
              : p
          )
        );
      }

      return { previous };
    },
    onError: (_err, _variables, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(['estoque-produtos'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque-produtos'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-kardex'] });
    },
  });
}

export function useBulkUpdateCategoria() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ ids, categoria }: { ids: string[]; categoria: string }) => {
      const { data, error } = await (supabase.from('estoque_produtos') as any)
        .update({ categoria })
        .in('id', ids)
        .select('*');

      if (error) {
        throw new Error(error.message);
      }
      return data as EstoqueProduto[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque-produtos'] });
    },
  });
}

export function useObraImpact(idObra: number | string | undefined, enabled = false) {
  const numId = Number(idObra);
  return useQuery({
    queryKey: ['obra-impact', numId],
    queryFn: async () => {
      if (!numId) return null;
      const res = await fetch(`/api/obras/${numId}/impact`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao calcular impacto da exclusão.');
      }
      return res.json() as Promise<{
        id_obra: number;
        cliente: string;
        status: string;
        cidade: string;
        photoCount: number;
        materialCount: number;
        totalQuantidadeMateriais: number;
      }>;
    },
    enabled: enabled && !isNaN(numId) && numId > 0,
    staleTime: 0,
  });
}

export function useDeleteObra() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (idObra: number) => {
      const res = await fetch(`/api/obras/${idObra}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao excluir obra.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-produtos'] });
      queryClient.invalidateQueries({ queryKey: ['obra-materiais'] });
      queryClient.invalidateQueries({ queryKey: ['obra-photos'] });
    },
  });
}

