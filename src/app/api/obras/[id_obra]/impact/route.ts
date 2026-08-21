import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserRole } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id_obra: string }> }
) {
  try {
    const role = await getUserRole();
    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado: Apenas administradores podem consultar o impacto de exclusão.' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const numId = Number(resolvedParams.id_obra);
    if (!numId || isNaN(numId)) {
      return NextResponse.json({ error: 'ID da obra é inválido.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Consulta metadados da obra
    const { data: obra, error: obraError } = await (supabase.from('obras' as any) as any)
      .select('id_obra, cliente, status, cidade')
      .eq('id_obra', numId)
      .single();

    if (obraError || !obra) {
      return NextResponse.json({ error: 'Obra não encontrada.' }, { status: 404 });
    }

    // 2. Contagem de fotos vinculadas
    const { count: photoCount, error: photoError } = await (supabase.from('obra_photos' as any) as any)
      .select('*', { count: 'exact', head: true })
      .eq('id_obra', numId);

    // 3. Contagem de materiais vinculados
    const { data: materiais, error: materiaisError } = await (supabase.from('obra_materiais' as any) as any)
      .select('id, quantidade_utilizada')
      .eq('id_obra', numId);

    const materialCount = (materiais || []).length;
    const totalQuantidadeMateriais = (materiais || []).reduce(
      (acc: number, item: any) => acc + (Number(item.quantidade_utilizada) || 0),
      0
    );

    return NextResponse.json({
      id_obra: numId,
      cliente: obra.cliente,
      status: obra.status,
      cidade: obra.cidade,
      photoCount: photoCount || 0,
      materialCount,
      totalQuantidadeMateriais,
    });
  } catch (error: any) {
    console.error('[IMPACT ROUTE ERROR]:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao calcular impacto da exclusão.' },
      { status: 500 }
    );
  }
}
