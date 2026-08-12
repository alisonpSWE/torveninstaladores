import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
