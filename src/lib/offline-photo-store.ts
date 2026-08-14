import { get, set, del, entries, createStore } from 'idb-keyval';

export interface OfflinePhoto {
  id: string; // Client-side UUID
  id_obra: number;
  obraId: number; // Alias para retrocompatibilidade
  file: Blob; // Blob comprimido armazenado no IndexedDB
  blob: Blob; // Alias para retrocompatibilidade
  fileName: string;
  contentType: string;
  bucket: string;
  storagePath: string;
  createdAt: number;
  timestamp: number;
  status: 'pending' | 'uploading' | 'failed';
}

// Tipo de alias para retrocompatibilidade com hooks existentes
export type PendingPhoto = OfflinePhoto;

// Cria uma store isolada no IndexedDB chamada 'torven-photos-store'
const photoStore = typeof window !== 'undefined' 
  ? createStore('torven-offline-photos-db', 'photos')
  : undefined;

/**
 * Salva uma foto comprimida no IndexedDB local com status 'pending'
 */
export async function savePhotoOffline(obraId: number, file: Blob, fileName?: string): Promise<OfflinePhoto> {
  const photoId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const now = Date.now();
  const cleanFileName = fileName || `foto_${obraId}_${now}.jpg`;
  const storagePath = `obra_${obraId}/${now}_${cleanFileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const photoRecord: OfflinePhoto = {
    id: photoId,
    id_obra: Number(obraId),
    obraId: Number(obraId),
    file,
    blob: file,
    fileName: cleanFileName,
    contentType: file.type || 'image/jpeg',
    bucket: 'photos',
    storagePath,
    timestamp: now,
    createdAt: now,
    status: 'pending',
  };

  if (photoStore) {
    await set(photoId, photoRecord, photoStore);
    console.log(`[OFFLINE PHOTO STORE] 📦 Foto #${photoId} salva no IndexedDB para a Obra #${obraId}.`);
  }

  return photoRecord;
}

// Alias de retrocompatibilidade para savePendingPhoto
export async function savePendingPhoto(photo: any): Promise<void> {
  const photoId = photo.id || `photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = photo.createdAt || photo.timestamp || Date.now();
  const obraId = Number(photo.obraId || photo.id_obra || 0);
  const blobObj = photo.blob || photo.file;
  const fileName = photo.fileName || `foto_${now}.jpg`;
  const storagePath = photo.storagePath || `obra_${obraId}/${now}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const record: OfflinePhoto = {
    id: photoId,
    id_obra: obraId,
    obraId: obraId,
    file: blobObj,
    blob: blobObj,
    fileName,
    contentType: photo.contentType || 'image/jpeg',
    bucket: photo.bucket || 'photos',
    storagePath,
    timestamp: now,
    createdAt: now,
    status: photo.status || 'pending',
  };

  if (photoStore) {
    await set(photoId, record, photoStore);
  }
}

/**
 * Retorna todas as fotos pendentes de uma obra específica cadastradas no IndexedDB
 */
export async function getOfflinePhotosByObra(obraId: number): Promise<OfflinePhoto[]> {
  if (!photoStore) return [];

  try {
    const allEntries = await entries<string, OfflinePhoto>(photoStore);
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
  if (!photoStore) return [];

  try {
    const allEntries = await entries<string, OfflinePhoto>(photoStore);
    return allEntries
      .map(([, photo]) => photo)
      .filter(Boolean)
      .sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error('[OFFLINE PHOTO STORE] ❌ Erro ao buscar todas as fotos locais:', error);
    return [];
  }
}

// Alias de retrocompatibilidade para getPendingPhotos
export async function getPendingPhotos(): Promise<OfflinePhoto[]> {
  return getAllOfflinePhotos();
}

// Alias para contar fotos pendentes
export async function getPendingPhotoCount(obraId?: number): Promise<number> {
  const all = await getAllOfflinePhotos();
  if (!obraId) return all.length;
  return all.filter((p) => Number(p.id_obra) === Number(obraId) || Number(p.obraId) === Number(obraId)).length;
}

/**
 * Remove uma foto do IndexedDB após o upload bem-sucedido
 */
export async function removeOfflinePhoto(id: string): Promise<void> {
  if (!photoStore || !id) return;
  await del(id, photoStore);
  console.log(`[OFFLINE PHOTO STORE] 🗑️ Foto #${id} removida do IndexedDB local.`);
}

// Alias de retrocompatibilidade para removePendingPhoto
export async function removePendingPhoto(id: string): Promise<void> {
  return removeOfflinePhoto(id);
}

/**
 * Atualiza o status de uma foto local (pending ➔ uploading ➔ failed)
 */
export async function updateOfflinePhotoStatus(
  id: string, 
  status: 'pending' | 'uploading' | 'failed'
): Promise<void> {
  if (!photoStore || !id) return;

  try {
    const record = await get<OfflinePhoto>(id, photoStore);
    if (record) {
      record.status = status;
      await set(id, record, photoStore);
    }
  } catch (error) {
    console.error(`[OFFLINE PHOTO STORE] Erro ao atualizar status da foto #${id}:`, error);
  }
}
