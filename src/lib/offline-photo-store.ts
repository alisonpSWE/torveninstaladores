import { get, set, del, entries, createStore } from 'idb-keyval';

export interface OfflinePhoto {
  id: string; // Client-side UUID
  id_obra: number;
  obraId: number; // Alias para retrocompatibilidade
  buffer?: ArrayBuffer; // In-memory raw buffer (100% seguro para iOS WebKit)
  file: Blob; // Blob armazenado no IndexedDB
  blob: Blob; // Alias para retrocompatibilidade
  fileName: string;
  contentType: string;
  bucket: string;
  storagePath: string;
  createdAt: number;
  timestamp: number;
  status: 'pending' | 'uploading' | 'failed';
  category?: 'registro' | 'projeto' | string;
  subcategory?: string;
}

export type PendingPhoto = OfflinePhoto;

// Store primária ativa
const primaryStore = typeof window !== 'undefined'
  ? createStore('torven-offline-photos-v2', 'photos')
  : undefined;

// Stores legadas para migração automática transparente
const legacyStore1 = typeof window !== 'undefined'
  ? createStore('torven-offline-photos-db', 'photos')
  : undefined;

/**
 * Reidratação Segura de ArrayBuffer/Blob em um objeto File com Buffer Intacto para Upload
 */
export function createRehydratedFile(photo: OfflinePhoto): File {
  const fileNameClean = (photo.fileName || `foto_${photo.id_obra || photo.obraId}_${Date.now()}.jpg`).replace(
    /[^a-zA-Z0-9._-]/g,
    '_'
  );
  const mimeType = photo.contentType || 'image/jpeg';

  // 1. Prioridade Máxima: ArrayBuffer puro em memória (Imune a perda de ponteiro no iOS)
  if (photo.buffer && photo.buffer.byteLength > 0) {
    return new File([photo.buffer], fileNameClean, { type: mimeType });
  }

  // 2. Fallback: Blob salvo no IndexedDB (extrai fatia isolada)
  const rawBlob = photo.file || photo.blob;
  if (rawBlob && rawBlob.size > 0) {
    const safeSlice = rawBlob.slice(0, rawBlob.size, mimeType);
    return new File([safeSlice], fileNameClean, { type: mimeType });
  }

  return new File([new Blob([], { type: mimeType })], fileNameClean, { type: mimeType });
}

/**
 * Migra fotos legadas para a store ativa
 */
async function migrateLegacyPhotos(): Promise<void> {
  if (!primaryStore || !legacyStore1) return;

  try {
    const legacyEntries = await entries<string, OfflinePhoto>(legacyStore1).catch(() => []);
    for (const [id, photo] of legacyEntries) {
      if (photo && photo.id) {
        await set(photo.id, photo, primaryStore);
        await del(id, legacyStore1).catch(() => {});
        console.log(`[OFFLINE STORE] 🚚 Foto #${photo.id} migrada da store legada para a v2.`);
      }
    }
  } catch {
    // Ignorado se a store legada não existir
  }
}

/**
 * Salva uma foto no IndexedDB local com ingestão estrita de ArrayBuffer
 */
export async function savePhotoOffline(
  obraId: number,
  source: Blob | File | ArrayBuffer,
  fileName?: string,
  category: string = 'registro',
  subcategory?: string
): Promise<OfflinePhoto> {
  const photoId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const now = Date.now();
  const cleanFileName = fileName || `foto_${obraId}_${now}.jpg`;
  const storagePath = `obra_${obraId}/${category}/${now}_${cleanFileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  // Extração imediata do ArrayBuffer para blindagem do iOS WebKit
  let rawBuffer: ArrayBuffer;
  if (source instanceof ArrayBuffer) {
    rawBuffer = source;
  } else if (source && typeof (source as Blob).arrayBuffer === 'function') {
    rawBuffer = await (source as Blob).arrayBuffer();
  } else {
    rawBuffer = new ArrayBuffer(0);
  }

  const safeBlob = new Blob([rawBuffer], { type: 'image/jpeg' });

  const photoRecord: OfflinePhoto = {
    id: photoId,
    id_obra: Number(obraId),
    obraId: Number(obraId),
    buffer: rawBuffer,
    file: safeBlob,
    blob: safeBlob,
    fileName: cleanFileName,
    contentType: 'image/jpeg',
    bucket: 'photos',
    storagePath,
    timestamp: now,
    createdAt: now,
    status: 'pending',
    category,
    subcategory: subcategory || 'geral',
  };

  if (primaryStore) {
    await set(photoId, photoRecord, primaryStore);
    console.log(
      `[OFFLINE PHOTO STORE] 📦 Foto #${photoId} salva no IndexedDB ` +
      `(${rawBuffer.byteLength} bytes) para a Obra #${obraId}.`
    );
  }

  return photoRecord;
}

export async function savePendingPhoto(photo: any): Promise<void> {
  const photoId = photo.id || `photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = photo.createdAt || photo.timestamp || Date.now();
  const obraId = Number(photo.obraId || photo.id_obra || 0);
  const source = photo.buffer || photo.blob || photo.file;
  const fileName = photo.fileName || `foto_${now}.jpg`;
  const storagePath = photo.storagePath || `obra_${obraId}/${now}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  let rawBuffer: ArrayBuffer;
  if (source instanceof ArrayBuffer) {
    rawBuffer = source;
  } else if (source && typeof (source as Blob).arrayBuffer === 'function') {
    rawBuffer = await (source as Blob).arrayBuffer();
  } else {
    rawBuffer = new ArrayBuffer(0);
  }

  const safeBlob = new Blob([rawBuffer], { type: photo.contentType || 'image/jpeg' });

  const record: OfflinePhoto = {
    id: photoId,
    id_obra: obraId,
    obraId: obraId,
    buffer: rawBuffer,
    file: safeBlob,
    blob: safeBlob,
    fileName,
    contentType: photo.contentType || 'image/jpeg',
    bucket: photo.bucket || 'photos',
    storagePath,
    timestamp: now,
    createdAt: now,
    status: photo.status || 'pending',
  };

  if (primaryStore) {
    await set(photoId, record, primaryStore);
  }
}

/**
 * Retorna todas as fotos pendentes de uma obra específica
 */
export async function getOfflinePhotosByObra(obraId: number): Promise<OfflinePhoto[]> {
  if (!primaryStore) return [];

  await migrateLegacyPhotos();

  try {
    const allEntries = await entries<string, OfflinePhoto>(primaryStore);
    const targetObraId = Number(obraId);

    return allEntries
      .map(([, photo]) => photo)
      .filter((photo) => photo && (Number(photo.id_obra) === targetObraId || Number(photo.obraId) === targetObraId))
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('[OFFLINE PHOTO STORE] ❌ Erro ao buscar fotos locais por obra:', error);
    return [];
  }
}

/**
 * Retorna todas as fotos salvas localmente no IndexedDB
 */
export async function getAllOfflinePhotos(): Promise<OfflinePhoto[]> {
  if (!primaryStore) return [];

  await migrateLegacyPhotos();

  try {
    const allEntries = await entries<string, OfflinePhoto>(primaryStore);
    return allEntries
      .map(([, photo]) => photo)
      .filter(Boolean)
      .sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error('[OFFLINE PHOTO STORE] ❌ Erro ao buscar todas as fotos locais:', error);
    return [];
  }
}

export async function getPendingPhotos(): Promise<OfflinePhoto[]> {
  return getAllOfflinePhotos();
}

export async function getPendingPhotoCount(obraId?: number): Promise<number> {
  const all = await getAllOfflinePhotos();
  if (!obraId) return all.length;
  return all.filter((p) => Number(p.id_obra) === Number(obraId) || Number(p.obraId) === Number(obraId)).length;
}

/**
 * Remove uma foto do IndexedDB após o upload bem-sucedido
 */
export async function removeOfflinePhoto(id: string): Promise<void> {
  if (!id) return;
  if (primaryStore) await del(id, primaryStore);
  if (legacyStore1) await del(id, legacyStore1).catch(() => {});
  console.log(`[OFFLINE PHOTO STORE] 🗑️ Foto #${id} removida do IndexedDB local.`);
}

export async function removePendingPhoto(id: string): Promise<void> {
  return removeOfflinePhoto(id);
}

/**
 * Atualiza o status de uma foto local
 */
export async function updateOfflinePhotoStatus(
  id: string,
  status: 'pending' | 'uploading' | 'failed'
): Promise<void> {
  if (!primaryStore || !id) return;

  try {
    const record = await get<OfflinePhoto>(id, primaryStore);
    if (record) {
      record.status = status;
      await set(id, record, primaryStore);
    }
  } catch (error) {
    console.error(`[OFFLINE PHOTO STORE] Erro ao atualizar status da foto #${id}:`, error);
  }
}
