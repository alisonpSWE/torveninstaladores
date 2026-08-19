import { get, set, del, entries, createStore } from 'idb-keyval';

export interface OfflineMaterialRecord {
  id: string;
  id_obra: number;
  id_produto: string;
  quantidade_utilizada: number;
  nome_produto: string;
  codigo_produto: string;
  unidade: string;
  observacoes?: string | null;
  timestamp: number;
  status: 'pending' | 'uploading' | 'failed';
}

const materiaisStore = typeof window !== 'undefined'
  ? createStore('torven-offline-materiais-v1', 'materiais')
  : undefined;

/**
 * Salva um lançamento de material offline no IndexedDB
 */
export async function saveMaterialOffline(
  idObra: number,
  idProduto: string,
  quantidade: number,
  nomeProduto: string,
  codigoProduto: string,
  unidade: string,
  observacoes?: string | null
): Promise<OfflineMaterialRecord> {
  const recordId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `mat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const now = Date.now();
  const record: OfflineMaterialRecord = {
    id: recordId,
    id_obra: Number(idObra),
    id_produto: idProduto,
    quantidade_utilizada: Number(quantidade),
    nome_produto: nomeProduto,
    codigo_produto: codigoProduto,
    unidade,
    observacoes: observacoes || null,
    timestamp: now,
    status: 'pending',
  };

  if (materiaisStore) {
    await set(recordId, record, materiaisStore);
    console.log(`[OFFLINE MATERIAIS] 📦 Material "${nomeProduto}" (${quantidade} ${unidade}) salvo offline para a Obra #${idObra}.`);
  }

  return record;
}

/**
 * Retorna todos os materiais pendentes de uma obra específica
 */
export async function getOfflineMateriaisByObra(idObra: number): Promise<OfflineMaterialRecord[]> {
  if (!materiaisStore) return [];

  try {
    const all = await entries<string, OfflineMaterialRecord>(materiaisStore);
    const targetId = Number(idObra);
    return all
      .map(([, mat]) => mat)
      .filter((mat) => mat && Number(mat.id_obra) === targetId)
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    console.error('[OFFLINE MATERIAIS] ❌ Erro ao buscar materiais por obra:', err);
    return [];
  }
}

/**
 * Retorna todos os materiais pendentes de todas as obras
 */
export async function getAllOfflineMateriais(): Promise<OfflineMaterialRecord[]> {
  if (!materiaisStore) return [];

  try {
    const all = await entries<string, OfflineMaterialRecord>(materiaisStore);
    return all
      .map(([, mat]) => mat)
      .filter(Boolean)
      .sort((a, b) => a.timestamp - b.timestamp);
  } catch (err) {
    console.error('[OFFLINE MATERIAIS] ❌ Erro ao buscar todos os materiais offline:', err);
    return [];
  }
}

/**
 * Remove um material sincronizado do IndexedDB
 */
export async function removeOfflineMaterial(id: string): Promise<void> {
  if (!materiaisStore || !id) return;
  await del(id, materiaisStore);
  console.log(`[OFFLINE MATERIAIS] 🗑️ Registro de material #${id} removido do cache local.`);
}

/**
 * Atualiza status de um material local
 */
export async function updateOfflineMaterialStatus(
  id: string,
  status: 'pending' | 'uploading' | 'failed'
): Promise<void> {
  if (!materiaisStore || !id) return;

  try {
    const record = await get<OfflineMaterialRecord>(id, materiaisStore);
    if (record) {
      record.status = status;
      await set(id, record, materiaisStore);
    }
  } catch (err) {
    console.error(`[OFFLINE MATERIAIS] Erro ao atualizar status #${id}:`, err);
  }
}
