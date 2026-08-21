import { NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';

// Status alvos que exigem o processamento do ETL
const ALLOWED_STATUSES = [
  'Em Análise Técnica',
  'Documentação em Análise',
  'Projeto Reprovado',
  'PA e RO liberado',
  'PA e RO Liberado',
  'Vistoria Solicitada',
];

export async function POST(request: Request) {
  const startTime = Date.now();
  console.log('\n======================================================');
  console.log('[WEBHOOK GRONER RECEIVER] 🔔 Nova requisição recebida!');
  console.log('======================================================');

  try {
    const rawBodyObject = await request.json().catch(() => ({}));

    console.log('[RECEIVER] 📦 Payload bruto recebido:\n', JSON.stringify(rawBodyObject, null, 2));

    // Extração flexível com suporte a PascalCase (Id, Status.Nome) e camelCase
    const rawId = rawBodyObject.Id || rawBodyObject.id || rawBodyObject.id_obra || rawBodyObject.projetoId || rawBodyObject.Content?.id;
    const rawStatus =
      rawBodyObject.Status?.Nome ||
      rawBodyObject.status?.nome ||
      rawBodyObject.novo_status ||
      (typeof rawBodyObject.Status === 'string' ? rawBodyObject.Status : null) ||
      (typeof rawBodyObject.status === 'string' ? rawBodyObject.status : null) ||
      rawBodyObject.etapaNome ||
      rawBodyObject.Content?.status?.nome;

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

    // URL dinâmica: Se QSTASH_PROCESS_URL estiver definida usa ela, senão constrói a URL a partir do request (funciona automático em Produção na Vercel e em Dev)
    const processUrl =
      process.env.QSTASH_PROCESS_URL ||
      new URL('/api/webhooks/groner/process', request.url).toString();

    console.log(`[RECEIVER] 🚀 Despachando para QStash (Destino: ${processUrl})...`);

    // CONVERSÃO EXPLÍCITA DO CORPO PARA STRING JSON VÁLIDA
    const jsonBodyString = JSON.stringify(rawBodyObject);

    const res = await client.publish({
      url: processUrl,
      body: jsonBodyString,
      headers: {
        'Content-Type': 'application/json',
      },
      retries: 3, // Força o QStash a tentar até 3 vezes se a Rota 2 (Processadora) falhar
    });

    const duration = Date.now() - startTime;
    console.log(`[RECEIVER] ✅ Enfileirado no QStash com sucesso em ${duration}ms! Message ID: ${res.messageId}`);
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
    return NextResponse.json(
      { error: error.message || 'Erro interno ao enfileirar webhook.' },
      { status: 500 }
    );
  }
}
