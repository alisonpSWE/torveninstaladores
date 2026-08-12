import { NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { fetchGronerProject } from '@/lib/groner/groner-api';
import { parseGronerProject } from '@/lib/groner/parse-groner-project';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_STATUSES = [
  'Em Análise Técnica',
  'Documentação em Análise',
  'Vistoria Solicitada',
];

export async function POST(request: Request) {
  console.log('\n======================================================');
  console.log('[QSTASH PROCESSOR] ⚡ Novo job recebido da fila QStash!');
  console.log('======================================================');

  // 1. VALIDAÇÃO DE SEGURANÇA DA ASSINATURA QSTASH (Se as chaves estiverem configuradas)
  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (currentKey && nextKey) {
    try {
      const signature = request.headers.get('upstash-signature') || '';
      const rawBody = await request.clone().text();

      const receiver = new Receiver({
        currentSigningKey: currentKey,
        nextSigningKey: nextKey,
      });

      const isValid = await receiver.verify({
        signature,
        body: rawBody,
      });

      if (!isValid) {
        console.error('[QSTASH PROCESSOR] ❌ Assinatura QStash inválida ou não autorizada!');
        return NextResponse.json({ error: 'Assinatura QStash não autorizada.' }, { status: 401 });
      }
    } catch (verifyError: any) {
      console.warn('[QSTASH PROCESSOR] ⚠️ Validação de assinatura pulada ou com erro local:', verifyError.message);
    }
  }

  try {
    const body = await request.json().catch(() => ({}));

    // Extração flexível de ID e Status
    const rawId = body.Id || body.id || body.id_obra || body.projetoId || body.Content?.id;
    const rawStatus =
      body.Status?.Nome ||
      body.status?.nome ||
      body.novo_status ||
      (typeof body.Status === 'string' ? body.Status : null) ||
      (typeof body.status === 'string' ? body.status : null) ||
      body.etapaNome ||
      body.Content?.status?.nome;

    const idObra = Number(rawId);
    const statusNome = typeof rawStatus === 'string' ? rawStatus.trim() : '';

    console.log(`[QSTASH PROCESSOR] 🔍 Processando Obra #${idObra}, Status: '${statusNome}'`);

    if (!idObra || isNaN(idObra)) {
      console.warn('[QSTASH PROCESSOR] ⚠️ ID de obra inválido no payload. Cancelando job sem retry.');
      // 200 OK para payload inválido permanente, evitando retries infinitos inúteis
      return NextResponse.json({ message: 'Payload inválido. Job descartado.' }, { status: 200 });
    }

    const matchedStatus = ALLOWED_STATUSES.find(
      (allowed) => allowed.toLowerCase() === statusNome.toLowerCase()
    ) || statusNome || 'Vistoria Solicitada';

    // 2. BUSCA DE DADOS NA API DA GRONER (8s max timeout por tentativa)
    console.log(`[QSTASH PROCESSOR] ⚙️ Conectando com a API Groner para a Obra #${idObra}...`);
    const rawData = await fetchGronerProject(idObra);

    console.log(`[QSTASH PROCESSOR] 📐 Executando parse ETL dos dados da Obra #${idObra}...`);
    const obraFormatada = parseGronerProject(rawData);

    obraFormatada.status = matchedStatus;

    console.log(
      `[QSTASH PROCESSOR] 📋 Resumo extraído da Obra #${idObra}:\n` +
      `  • Cliente: ${obraFormatada.cliente}\n` +
      `  • Cidade: ${obraFormatada.cidade}\n` +
      `  • Potência: ${obraFormatada.potencia_total_kwp} kWp\n` +
      `  • Inversor: ${obraFormatada.inversor_marca} ${obraFormatada.inversor_modelo}`
    );

    // 3. PERSISTÊNCIA NO SUPABASE VIA CLIENTE ADMIN
    const supabase = createAdminClient();
    const { data, error } = await (supabase.from('obras' as any) as any)
      .upsert(obraFormatada, { onConflict: 'id_obra' })
      .select()
      .single();

    if (error) {
      console.error(`[QSTASH PROCESSOR] ❌ Erro de banco no Supabase para Obra #${idObra}:`, error.message);
      // Retorna HTTP 500 estrito para FORÇAR O RETRY NO QSTASH se o banco estiver indisponível
      return NextResponse.json(
        { error: `Erro no Supabase: ${error.message}` },
        { status: 500 }
      );
    }

    console.log(`[QSTASH PROCESSOR] ✅ Sucesso absoluto! Obra #${idObra} ("${obraFormatada.cliente}") gravada no Supabase.`);
    console.log('======================================================\n');

    // 200 OK indica para o QStash que o job foi CONCLUÍDO e pode ser removido da fila
    return NextResponse.json({
      message: `Job concluído com sucesso para Obra #${idObra}!`,
      status: matchedStatus,
      obra: data,
    });
  } catch (error: any) {
    console.error('[QSTASH PROCESSOR] 💥 Falha na execução do Job:', error?.message || error);

    // RETORNA HTTP 500 ESTRITO PARA O QSTASH DISPARAR RETRY COM BACKOFF EXPONENCIAL
    return NextResponse.json(
      {
        error: error?.message || 'Falha no processamento do job.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
