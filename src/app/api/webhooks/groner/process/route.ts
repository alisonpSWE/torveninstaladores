import { NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { fetchGronerProject } from '@/lib/groner/groner-api';
import { parseGronerProject } from '@/lib/groner/parse-groner-project';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_STATUSES = [
  'Em Análise Técnica',
  'Documentação em Análise',
  'Projeto Reprovado',
  'PA e RO liberado',
  'PA e RO Liberado',
  'Vistoria Solicitada',
];

export async function POST(request: Request) {
  console.log('\n======================================================');
  console.log('[QSTASH PROCESSOR] ⚡ Novo job recebido da fila QStash!');
  console.log('======================================================');

  // 1. SEGURANÇA (JWT / Assinatura QStash)
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
        console.error('[QSTASH PROCESSOR] ❌ Assinatura QStash não autorizada!');
        return NextResponse.json({ error: 'Assinatura QStash não autorizada.' }, { status: 401 });
      }
    } catch (verifyError: any) {
      console.warn('[QSTASH PROCESSOR] ⚠️ Validação de assinatura pulada em dev local:', verifyError.message);
    }
  }

  try {
    let body = await request.json().catch(() => ({}));

    // Se o QStash entregar como string JSON, realiza o parse defensivo
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.warn('[QSTASH PROCESSOR] ⚠️ Não foi possível fazer parse do body string.');
      }
    }

    // 2. EXTRAÇÃO SEGURA (Tolerando PascalCase e camelCase)
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
      return NextResponse.json({ message: 'Payload inválido. Job descartado.' }, { status: 200 });
    }

    const matchedStatus = ALLOWED_STATUSES.find(
      (allowed) => allowed.toLowerCase() === statusNome.toLowerCase()
    ) || statusNome || 'Vistoria Solicitada';

    // 3. PROCESSAMENTO ETL (API Groner + Parse)
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

    // PERSISTÊNCIA NO SUPABASE VIA CLIENTE ADMIN
    const supabase = createAdminClient();
    const { data, error } = await (supabase.from('obras' as any) as any)
      .upsert(obraFormatada, { onConflict: 'id_obra' })
      .select()
      .single();

    if (error) {
      console.error(`[QSTASH PROCESSOR] ❌ Erro no Supabase para Obra #${idObra}:`, error.message);
      // 4. RETORNO 500 ESTRITO PARA ACIONAR RETRY NO QSTASH COM BACKOFF EXPONENCIAL
      return NextResponse.json(
        { error: `Erro no Supabase: ${error.message}` },
        { status: 500 }
      );
    }

    console.log(`[QSTASH PROCESSOR] ✅ Sucesso absoluto! Obra #${idObra} ("${obraFormatada.cliente}") gravada no Supabase.`);
    console.log('======================================================\n');

    return NextResponse.json({
      message: `Job concluído com sucesso para Obra #${idObra}!`,
      status: matchedStatus,
      obra: data,
    });
  } catch (error: any) {
    console.error('[QSTASH PROCESSOR] 💥 Falha na execução do Job:', error?.message || error);
    // 4. RETORNO 500 ESTRITO PARA ACIONAR RETRY NO QSTASH COM BACKOFF EXPONENCIAL
    return NextResponse.json(
      { error: error?.message || 'Falha no processamento do job QStash.' },
      { status: 500 }
    );
  }
}
