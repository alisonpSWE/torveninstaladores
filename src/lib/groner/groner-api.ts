export async function fetchGronerProject(idObra: number | string, retries = 2): Promise<any> {
  const token = process.env.GRONER_API_TOKEN;
  if (!token) {
    throw new Error('GRONER_API_TOKEN não configurado no ambiente.');
  }

  const cleanToken = token.trim().replace(/^["']|["']$/g, '');
  const baseUrl = 'https://torvenengenharia.api.groner.app';
  const url = `${baseUrl}/api/Projeto/${idObra}`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    // Timeout de 8 segundos por tentativa para caber no ciclo serverless da Vercel
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API Groner (${response.status}): ${errorText}`);
      }

      const rawData = await response.json();
      return rawData;
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error.name === 'AbortError' 
        ? new Error(`Tempo limite (8s) excedido ao conectar com a API do Groner para a obra #${idObra}.`)
        : error;

      console.warn(`[GRONER API] Tentativa ${attempt}/${retries} para obra #${idObra} falhou:`, lastError?.message);

      if (attempt < retries) {
        // Backoff rápido: 1s
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError || new Error(`Falha ao buscar a obra #${idObra} no Groner após ${retries} tentativas.`);
}
