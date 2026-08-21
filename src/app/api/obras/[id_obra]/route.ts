import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserRole } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id_obra: string }> }
) {
  try {
    const resolvedParams = await params;
    const numId = Number(resolvedParams.id_obra);
    if (!numId || isNaN(numId)) {
      return NextResponse.json({ error: 'ID da obra é inválido.' }, { status: 400 });
    }

    const body = await request.json();
    const updatePayload: Record<string, any> = {};

    if (body.status !== undefined) updatePayload.status = body.status;
    if (body.observacoes !== undefined) updatePayload.observacoes = body.observacoes;
    if (body.link_fotos !== undefined) updatePayload.link_fotos = body.link_fotos;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await (supabase.from('obras' as any) as any)
      .update(updatePayload)
      .eq('id_obra', numId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Obra atualizada com sucesso.', obra: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id_obra: string }> }
) {
  try {
    // 1. Validação estrita de privilégios de Administrador
    const role = await getUserRole();
    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado: Apenas administradores têm permissão para excluir obras.' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const numId = Number(resolvedParams.id_obra);
    if (!numId || isNaN(numId)) {
      return NextResponse.json({ error: 'ID da obra é inválido.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 2. Coletar todos os arquivos no Storage vinculados a esta obra
    const { data: photos, error: photosError } = await (supabase.from('obra_photos' as any) as any)
      .select('storage_path')
      .eq('id_obra', numId);

    if (photosError) {
      console.warn(`[DELETE OBRA] Aviso ao consultar fotos da Obra #${numId}:`, photosError.message);
    }

    const storagePaths: string[] = (photos || [])
      .map((p: any) => p.storage_path)
      .filter((p: any): p is string => typeof p === 'string' && p.trim().length > 0);

    // 3. Remover os arquivos físicos do Bucket 'photos' no Supabase Storage
    if (storagePaths.length > 0) {
      console.log(`[DELETE OBRA] 📦 Removendo ${storagePaths.length} foto(s) física(s) do Storage para a Obra #${numId}...`);
      const { error: storageError } = await supabase.storage.from('photos').remove(storagePaths);
      if (storageError) {
        console.warn(`[DELETE OBRA] ⚠️ Aviso ao remover binários do Storage:`, storageError.message);
      } else {
        console.log(`[DELETE OBRA] ✅ Fotos físicas removidas do Storage com sucesso.`);
      }
    }

    // 4. Executar DELETE na tabela obras
    // O ON DELETE CASCADE no Postgres remove as linhas de obra_photos e obra_materiais,
    // e o trigger fn_atualizar_saldo_estoque_materiais estorna automaticamente o saldo consumido de volta para estoque_produtos
    const { error: deleteError } = await (supabase.from('obras' as any) as any)
      .delete()
      .eq('id_obra', numId);

    if (deleteError) {
      console.error(`[DELETE OBRA] ❌ Erro ao deletar Obra #${numId}:`, deleteError.message);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    console.log(`[DELETE OBRA] 🗑️ Obra #${numId} excluída permanentemente com cascade de fotos e materiais.`);

    return NextResponse.json({
      message: `Obra #${numId} excluída com sucesso! Todos os dados e fotos foram removidos.`,
      id_obra: numId,
      photosRemoved: storagePaths.length,
    });
  } catch (error: any) {
    console.error(`[DELETE OBRA] 💥 Erro interno:`, error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao excluir obra.' },
      { status: 500 }
    );
  }
}
