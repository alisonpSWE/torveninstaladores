import { createStore, entries, del, set } from 'idb-keyval';

export interface PendingPhoto {
  id: string;
  blob: Blob;
  fileName: string;
  contentType: string;
  bucket: string;
  storagePath: string;
  obraId: number;
  createdAt: number;
}

const photoStore = createStore('torven-offline-photos-db', 'pending-photos');

export async function savePendingPhoto(photo: PendingPhoto): Promise<void> {
  await set(photo.id, photo, photoStore);
}

export async function getPendingPhotos(): Promise<PendingPhoto[]> {
  const allEntries = await entries<string, PendingPhoto>(photoStore);
  return allEntries.map(([_, photo]) => photo);
}

export async function removePendingPhoto(id: string): Promise<void> {
  await del(id, photoStore);
}

export async function getPendingPhotoCount(): Promise<number> {
  const photos = await getPendingPhotos();
  return photos.length;
}
