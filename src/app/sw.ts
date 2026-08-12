import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';
import { createClient } from '@supabase/supabase-js';
import { getPendingPhotos, removePendingPhoto } from '@/lib/offline-photo-store';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Handler da Background Sync API para upload de fotos quando a internet voltar
async function processPhotoUploadQueue() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const pendingPhotos = await getPendingPhotos();

  for (const photo of pendingPhotos) {
    try {
      const { error } = await supabase.storage
        .from(photo.bucket)
        .upload(photo.storagePath, photo.blob, {
          contentType: photo.contentType,
          upsert: true,
        });

      if (error) {
        console.error(`[SW Background Sync] Erro ao enviar foto ${photo.id}:`, error.message);
        throw error;
      }

      console.log(`[SW Background Sync] Foto ${photo.id} enviada com sucesso!`);
      await removePendingPhoto(photo.id);
    } catch (err) {
      console.error(`[SW Background Sync] Falha no upload da foto ${photo.id}:`, err);
      throw err; // Re-throw faz o navegador reagendar o sync com backoff
    }
  }
}

self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-photos') {
    event.waitUntil(processPhotoUploadQueue());
  }
});
