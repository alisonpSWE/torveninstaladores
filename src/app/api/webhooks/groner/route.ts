import { NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';

// Status alvos que exigem o processamento do ETL
const ALLOWED_STATUSES = [
  'Em Análise Técnica',
  'Documentação em Análise',
  'Vistoria Solicitada',
];

export async function POST(request: Request) {
  const startTime = Date.now();
  console.log('\n======================================================');
  console.log('[WEBHOOK GRONER RECEIVER] 🔔 Nova requisição recebida!');
  console.log('======================================================');

  try {
    const body = await request.json().catch(() => ({}));

    // Extração flexível com suporte a PascalCase (Id, Status.Nome) e camelCase
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

    console.log(`[RECEIVER] 🔍 Extração -> ID: ${idObra || 'Indefinido'}, Status: '${statusNome || 'Indefinido'}'`);

    if (!idObra || isNaN(idObra)) {
      console.warn('[RECEIVER] ⚠️ Ignorado (200 OK): Nenhum ID de obra válido no payload.');
      return NextResponse.json(
        { message: 'Webhook recebido, mas nenhum ID de obra válido foi encontrado.' },
        { status: 200 }
      );
    }

    // 1. FILTRO RÁPIDO DE STATUS
    const matchedStatus = ALLOWED_STATUSES.find(
      (allowed) => allowed.toLowerCase() === statusNome.toLowerCase()
    );

    if (!matchedStatus) {
      console.log(`[RECEIVER] ⏭️ Ignorado (200 OK em ${Date.now() - startTime}ms): Status '${statusNome}' fora do escopo.`);
      return NextResponse.json(
        {
          message: `Webhook recebido. Status '${statusNome}' não exige processamento.`,
          processed: false,
        },
        { status: 200 }
      );
    }

    // 2. ENFILEIRAMENTO RESILIENTE NO QSTASH
    const client = new Client();
    const processUrl =
      process.env.QSTASH_PROCESS_URL ||
      new URL('/api/webhooks/groner/process', request.url).toString();

    console.log(`[RECEIVER] 🚀 Despachando para QStash (Destino: ${processUrl})...`);

    // Publica no QStash configurando 3 retries e timeout curto
    const res = await client.publish({
      url: processUrl,
      body,
      retries: 3, // Força o QStash a tentar até 3 vezes se a Rota 2 (Processadora) falhar
    });

    const duration = Date.now() - startTime;
    console.log(`[RECEIVER] ✅ Enfileirado com sucesso em ${duration}ms! Message ID: ${res.messageId}`);
    console.log('======================================================\n');

    // Resposta ultra-rápida HTTP 200 OK para o Groner CRM (< 200ms)
    return NextResponse.json({
      message: `Webhook da Obra #${idObra} recebido e enfileirado no QStash com sucesso!`,
      enqueued: true,
      status: matchedStatus,
      messageId: res.messageId,
      responseTimeMs: duration,
    });
  } catch (error: any) {
    console.error('[RECEIVER] 💥 Erro ao comunicar com QStash:', error);
    // Retorna HTTP 500 caso a chamada à Upstash falhe completamente
    return NextResponse.json(
      { error: error.message || 'Erro interno ao enfileirar webhook.' },
      { status: 500 }
    );
  }
}
