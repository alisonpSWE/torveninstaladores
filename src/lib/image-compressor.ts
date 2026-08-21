/**
 * Compressor Nativo via Canvas 2D Otimizado para iOS WebKit e Android
 * - 100% Offline (zero dependência de scripts externos ou WebWorkers)
 * - Ingestão imediata de ArrayBuffer para cortar o ponteiro temporário do iOS WebKit
 * - Suporte nativo a fotos HEIC/HEIF de iPhones convertendo para JPEG padrão
 * - Limpeza agressiva de memória GPU/RAM no Canvas
 * - Redimensionamento proporcional (Max 1920px Full HD)
 */

export interface CompressedImageResult {
  file: File;
  buffer: ArrayBuffer;
  blob: Blob;
  fileName: string;
  sizeBytes: number;
}

export async function compressImageNative(
  source: File | Blob | ArrayBuffer,
  fileName: string = `foto_${Date.now()}.jpg`,
  maxDimension: number = 1920,
  quality: number = 0.82
): Promise<CompressedImageResult> {
  // 1. INGESTÃO IMEDIATA EM MEMÓRIA RAM (ArrayBuffer)
  let rawBuffer: ArrayBuffer;
  let mimeType = 'image/jpeg';

  if (source instanceof ArrayBuffer) {
    rawBuffer = source;
  } else if (source && typeof (source as Blob).arrayBuffer === 'function') {
    rawBuffer = await (source as Blob).arrayBuffer();
    if ((source as Blob).type) mimeType = (source as Blob).type;
  } else {
    throw new Error('Formato de fonte inválido para compressão de imagem.');
  }

  if (!rawBuffer || rawBuffer.byteLength === 0) {
    throw new Error('Buffer de imagem vazio.');
  }

  // Normalização de extensão: converte .heic, .heif, .png para .jpg
  let baseName = fileName || `foto_${Date.now()}.jpg`;
  if (!/\.(jpg|jpeg)$/i.test(baseName)) {
    baseName = baseName.replace(/\.[a-zA-Z0-9]+$/, '') + '.jpg';
  }
  const cleanFileName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');

  const initialBlob = new Blob([rawBuffer], { type: mimeType });

  // 2. RENDERIZAÇÃO VIA CANVAS 2D NATIVO (100% Offline e compatível com iOS Safari)
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(initialBlob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Cálculo proporcional de redimensionamento para no máximo 1920px
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        fallbackResolve();
        return;
      }

      // Preenchimento de fundo branco para evitar artefatos em imagens transparentes/PNG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        async (compressedBlob) => {
          if (compressedBlob && compressedBlob.size > 0) {
            try {
              const compressedBuffer = await compressedBlob.arrayBuffer();
              const compressedFile = new File([compressedBuffer], cleanFileName, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });

              // Desalocação explícita de memória do Canvas (previne crash no iOS Safari)
              canvas.width = 0;
              canvas.height = 0;

              console.log(
                `[IMAGE COMPRESSOR NATIVE] ✅ Compressão concluída: ` +
                `${(rawBuffer.byteLength / 1024).toFixed(1)}KB ➔ ${(compressedFile.size / 1024).toFixed(1)}KB ` +
                `(${width}x${height}px)`
              );

              resolve({
                file: compressedFile,
                buffer: compressedBuffer,
                blob: compressedBlob,
                fileName: cleanFileName,
                sizeBytes: compressedFile.size,
              });
            } catch {
              fallbackResolve();
            }
          } else {
            fallbackResolve();
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      console.warn('[IMAGE COMPRESSOR NATIVE] ⚠️ Erro ao decodificar imagem no canvas. Usando fallback de buffer puro.');
      fallbackResolve();
    };

    function fallbackResolve() {
      const fallbackFile = new File([rawBuffer], cleanFileName, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      resolve({
        file: fallbackFile,
        buffer: rawBuffer,
        blob: new Blob([rawBuffer], { type: 'image/jpeg' }),
        fileName: cleanFileName,
        sizeBytes: fallbackFile.size,
      });
    }

    img.src = objectUrl;
  });
}

/**
 * Função de conveniência retrocompatível
 */
export async function compressImage(file: File): Promise<File> {
  const result = await compressImageNative(file, file.name);
  return result.file;
}
