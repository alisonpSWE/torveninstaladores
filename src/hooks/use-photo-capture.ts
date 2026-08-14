import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { compressImage } from '@/lib/image-compressor';
import { savePhotoOffline, OfflinePhoto } from '@/lib/offline-photo-store';

export interface UsePhotoCaptureReturn {
  capturePhoto: (file: File, idObra: number) => Promise<OfflinePhoto | null>;
  isCompressing: boolean;
  error: string | null;
}

/**
 * Hook customizado para captura, compressão e salvamento offline de fotos no PWA.
 * Fluxo Estrito:
 * 1. Recebe o File original da câmera/galeria
 * 2. Executa a compressão via WebWorker (browser-image-compression, max 500KB, EXIF orientation fix)
 * 3. Salva o Blob comprimido no IndexedDB via idb-keyval (status: 'pending')
 * 4. Invalida as queries do TanStack para atualizar a galeria visual instantaneamente
 */
export function usePhotoCapture(): UsePhotoCaptureReturn {
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const capturePhoto = async (file: File, idObra: number): Promise<OfflinePhoto | null> => {
    if (!file || !idObra) {
      setError('Arquivo de imagem ou ID da obra inválido.');
      return null;
    }

    setIsCompressing(true);
    setError(null);

    try {
      // 1. COMPRESSÃO DE IMAGEM
      console.log(`[USE PHOTO CAPTURE] 📸 Iniciando captura para a Obra #${idObra}...`);
      const compressedFile = await compressImage(file);

      // 2. ARMAZENAMENTO NO COFRE LOCAL (IndexedDB)
      const offlineRecord = await savePhotoOffline(idObra, compressedFile, file.name);

      // 3. ATUALIZAÇÃO REATIVA DO TANSTACK QUERY
      queryClient.invalidateQueries({ queryKey: ['offline-photos', Number(idObra)] });
      queryClient.invalidateQueries({ queryKey: ['obra-photos-all', Number(idObra)] });

      console.log(`[USE PHOTO CAPTURE] ✅ Foto #${offlineRecord.id} pronta e salva no IndexedDB!`);
      return offlineRecord;
    } catch (err: any) {
      const errorMessage = err.message || 'Falha ao processar e salvar a foto localmente.';
      console.error('[USE PHOTO CAPTURE] 💥 Erro na captura de foto:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsCompressing(false);
    }
  };

  return {
    capturePhoto,
    isCompressing,
    error,
  };
}
