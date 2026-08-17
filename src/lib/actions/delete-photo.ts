import { createClient } from '@/lib/supabase/client';

export interface DeletePhotoParams {
  photoId: string;
  storagePath: string;
  idObra: number;
}

/**
 * Realiza o Hard Delete definitivo de uma foto (Storage ➔ Banco de Dados)
 * Exige que o usuário autenticado possua role 'admin'
 */
export async function deleteObraPhoto({
  photoId,
  storagePath,
  idObra,
}: DeletePhotoParams): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    console.log(`[DELETE PHOTO ACTION] 🗑️ Iniciando exclusão da foto #${photoId} (Obra #${idObra})...`);

    // 1. PRIMEIRO PASSO: Deleta o arquivo físico do Supabase Storage
    if (storagePath) {
      console.log(`[DELETE PHOTO ACTION] 📦 Removendo do Storage: ${storagePath}...`);
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([storagePath]);

      if (storageError) {
        console.error('[DELETE PHOTO ACTION] ❌ Erro ao remover do Storage:', storageError);
        // Se o erro for de permissão (não-admin) ou falha crítica, aborta
        if (storageError.message.includes('row-level security') || storageError.message.includes('unauthorized')) {
          throw new Error('Apenas administradores têm permissão para apagar fotos.');
        }
        // Se o arquivo não existir mais no storage, prossegue com a limpeza do banco
      }
    }

    // 2. SEGUNDO PASSO: Deleta o registro de metadados na tabela obra_photos
    console.log(`[DELETE PHOTO ACTION] 💾 Deletando registro na tabela obra_photos...`);
    const { error: dbError } = await (supabase.from('obra_photos' as any) as any)
      .delete()
      .eq('id', photoId);

    if (dbError) {
      console.error('[DELETE PHOTO ACTION] ❌ Erro ao deletar do banco:', dbError);
      if (dbError.message.includes('row-level security') || dbError.message.includes('permission denied')) {
        throw new Error('Permissão negada: apenas administradores podem apagar fotos.');
      }
      throw new Error(`Erro ao apagar registro do banco: ${dbError.message}`);
    }

    console.log(`[DELETE PHOTO ACTION] ✅ Foto #${photoId} excluída com sucesso!`);
    return { success: true };
  } catch (err: any) {
    console.error('[DELETE PHOTO ACTION] ❌ Falha na exclusão:', err.message || err);
    return { success: false, error: err.message || 'Falha ao excluir foto.' };
  }
}
