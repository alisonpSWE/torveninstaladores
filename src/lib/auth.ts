import { createClient as createServerClient } from '@/lib/supabase/server';
import { AppRole, Perfil } from '@/lib/supabase/types';

/**
 * Resgata o usuário autenticado e seu perfil com role do banco de dados (Server-side)
 */
export async function getUserPerfil(): Promise<{ user: any | null; perfil: Perfil | null }> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { user: null, perfil: null };
    }

    const { data: perfil, error: perfilError } = await supabase
      .from('perfis' as any)
      .select('*')
      .eq('id', user.id)
      .single();

    if (perfilError || !perfil) {
      console.warn(`[AUTH SERVICE] Perfil não encontrado para o usuário #${user.id}`);
      return { user, perfil: null };
    }

    return { user, perfil: perfil as Perfil };
  } catch (err: any) {
    console.error('[AUTH SERVICE] Erro ao recuperar perfil do usuário:', err.message || err);
    return { user: null, perfil: null };
  }
}

/**
 * Resgata o cargo (role) do usuário autenticado no servidor
 */
export async function getUserRole(): Promise<AppRole | null> {
  const { perfil } = await getUserPerfil();
  return perfil?.role || null;
}
