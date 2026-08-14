import imageCompression from 'browser-image-compression';

/**
 * Opções de compressão otimizadas para PWA móvel:
 * - Limite de 500KB (maxSizeMB: 0.5)
 * - Resolução máxima de 1920px (Full HD)
 * - Web Worker habilitado para não travar a UI/Main Thread
 * - Preservação automática de orientação EXIF (iOS / Android)
 */
export async function compressImage(file: File): Promise<File> {
  // Se já for menor que 500KB e não precisar de redimensionamento, retorna direto
  if (file.size <= 500 * 1024 && !file.type.startsWith('image/heic')) {
    console.log(`[IMAGE COMPRESSOR] ⚡ Imagem pequena (${(file.size / 1024).toFixed(1)}KB). Compressão ignorada.`);
    return file;
  }

  console.log(
    `[IMAGE COMPRESSOR] 🔄 Iniciando compressão da imagem "${file.name}" ` +
    `(${(file.size / 1024 / 1024).toFixed(2)}MB)...`
  );

  const options = {
    maxSizeMB: 0.5, // 500 KB max limit
    maxWidthOrHeight: 1920, // Max dimension Full HD (1920px)
    useWebWorker: true, // Processamento fora da main UI thread
    initialQuality: 0.85,
    fileType: 'image/jpeg',
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    
    // Converte o Blob resultante de volta para objeto File preservando o nome original
    const compressedFile = new File([compressedBlob], file.name || `photo_${Date.now()}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    console.log(
      `[IMAGE COMPRESSOR] ✅ Compressão concluída: ` +
      `${(file.size / 1024).toFixed(1)}KB ➔ ${(compressedFile.size / 1024).toFixed(1)}KB ` +
      `(-${(100 - (compressedFile.size / file.size) * 100).toFixed(0)}%)`
    );

    return compressedFile;
  } catch (error: any) {
    console.warn('[IMAGE COMPRESSOR] ⚠️ Falha na compressão. Utilizando imagem original:', error.message || error);
    return file;
  }
}
