import { NextResponse } from 'next/server';
import { fetchGronerProject } from '@/lib/groner/groner-api';
import { parseGronerProject } from '@/lib/groner/parse-groner-project';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserRole } from '@/lib/auth';
import { Obra } from '@/lib/supabase/types';

export async function POST(request: Request) {
  try {
    // 1. Blindagem de segurança no Backend: Apenas administradores podem importar manualmente
    const role = await getUserRole();
    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado: Apenas administradores podem importar obras manualmente.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const rawIds = body.id_obra || body.idObra || body.ids;

    if (!rawIds) {
      return NextResponse.json(
        { error: 'ID ou lista de IDs da obra é obrigatório.' },
        { status: 400 }
      );
    }

    // Normaliza para array
    const idsArray: number[] = (Array.isArray(rawIds) ? rawIds : [rawIds])
      .map((id: any) => Number(id))
      .filter((id: number) => !isNaN(id) && id > 0);

    if (idsArray.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum ID numérico válido foi fornecido.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const successfulObras: Obra[] = [];
    const errors: { id: number; message: string }[] = [];

    // Processamento sequencial para garantir resiliência e isolamento
    for (const idObra of idsArray) {
      try {
        const rawData = await fetchGronerProject(idObra);
        const obraFormatada = parseGronerProject(rawData);

        if (!obraFormatada.id_obra) {
          errors.push({ id: idObra, message: 'Dados da obra retornaram sem ID válido.' });
          continue;
        }

        const { data, error } = await supabase
          .from('obras')
          .upsert(obraFormatada as any, { onConflict: 'id_obra' })
          .select()
          .single();

        if (error) {
          errors.push({ id: idObra, message: `Erro no Supabase: ${error.message}` });
        } else if (data) {
          successfulObras.push(data as Obra);
        }
      } catch (err: any) {
        errors.push({ id: idObra, message: err.message || 'Falha ao importar do Groner.' });
      }
    }

    if (successfulObras.length === 0) {
      return NextResponse.json(
        {
          error: 'Nenhuma obra pôde ser importada.',
          details: errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `${successfulObras.length} obra(s) importada(s) com sucesso!`,
      obras: successfulObras,
      obra: successfulObras[0],
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Erro na rota import-obra:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao importar obra(s).' },
      { status: 500 }
    );
  }
}
