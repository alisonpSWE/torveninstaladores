'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/image-compressor';
import { PROJECT_SUBCATEGORIES, ProjectSubcategoryId } from '@/lib/supabase/types';
import { CategoryIcon } from './category-icon';
import { UploadCloud, Loader2, CheckCircle2, AlertCircle, Layers } from 'lucide-react';

interface ProjectPhotoDropzoneProps {
  obraId: number;
  defaultSubcategory?: ProjectSubcategoryId;
}

export function ProjectPhotoDropzone({
  obraId,
  defaultSubcategory = 'geral',
}: ProjectPhotoDropzoneProps) {
  const [selectedSubcategory, setSelectedSubcategory] = useState<ProjectSubcategoryId>(defaultSubcategory);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
    stage: 'compressing' | 'uploading' | 'saving';
  } | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const queryClient = useQueryClient();
  const supabase = createClient();

  /**
   * ENGENHARIA DA FILA SEQUENCIAL (Regra Estrita):
   * Quando o usuário soltar 10, 20 ou mais fotos de uma vez, NÃO utiliza Promise.all
   * para evitar travamento da CPU do navegador.
   * Executa um loop 'for...of' sequencial (1 foto por vez).
   */
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles || acceptedFiles.length === 0 || !obraId) return;

      setIsProcessing(true);
      setErrorFeedback(null);
      setSuccessFeedback(null);

      const totalFiles = acceptedFiles.length;
      let successCount = 0;
      let failCount = 0;

      let index = 0;
      for (const file of acceptedFiles) {
        index++;
        try {
          if (!isMountedRef.current) break;

          // 1. Estágio: Compressão via WebWorker (1 arquivo por vez)
          setProgress({
            current: index,
            total: totalFiles,
            fileName: file.name,
            stage: 'compressing',
          });

          const compressedFile = await compressImage(file);

          if (!isMountedRef.current) break;

          // 2. Estágio: Upload no Storage (Bucket 'photos')
          setProgress({
            current: index,
            total: totalFiles,
            fileName: file.name,
            stage: 'uploading',
          });

          const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `obra_${obraId}/projeto/${Date.now()}_${index}_${cleanFileName}`;

          const { error: uploadError } = await supabase.storage
            .from('photos')
            .upload(storagePath, compressedFile, {
              contentType: compressedFile.type || 'image/jpeg',
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`Erro no Storage: ${uploadError.message}`);
          }

          // 3. Resgate da URL pública
          const { data: publicUrlData } = supabase.storage
            .from('photos')
            .getPublicUrl(storagePath);

          const publicUrl = publicUrlData.publicUrl;

          if (!isMountedRef.current) break;

          // 4. Estágio: Inserção na Tabela obra_photos com category: 'projeto' e subcategory definida
          setProgress({
            current: index,
            total: totalFiles,
            fileName: file.name,
            stage: 'saving',
          });

          const insertPayload: any = {
            id_obra: Number(obraId),
            storage_path: storagePath,
            public_url: publicUrl,
            file_name: file.name,
            content_type: compressedFile.type || 'image/jpeg',
            size_bytes: compressedFile.size,
            category: 'projeto',
            subcategory: selectedSubcategory || 'geral',
          };

          const { error: dbError } = await supabase
            .from('obra_photos' as any)
            .insert(insertPayload);

          if (dbError) {
            throw new Error(`Erro no banco: ${dbError.message}`);
          }

          successCount++;
        } catch (err: any) {
          failCount++;
          console.error(`[PROJECT DROPZONE] Falha ao processar arquivo "${file.name}":`, err.message || err);
        }
      }

      if (!isMountedRef.current) return;

      setIsProcessing(false);
      setProgress(null);

      // Invalidação das queries do TanStack para revalidar a lista na tela
      queryClient.invalidateQueries({ queryKey: ['obra-photos', Number(obraId)] });
      queryClient.invalidateQueries({ queryKey: ['obra-photos-projeto', Number(obraId)] });

      if (failCount === 0) {
        setSuccessFeedback(`${successCount} foto(s) de projeto enviada(s) com sucesso na categoria "${PROJECT_SUBCATEGORIES.find(s => s.id === selectedSubcategory)?.label || 'Geral'}"!`);
      } else {
        setErrorFeedback(`${successCount} enviada(s), mas ${failCount} falhou(aram). Tente novamente.`);
      }
    },
    [obraId, queryClient, selectedSubcategory, supabase]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic'],
    },
    disabled: isProcessing,
  });

  return (
    <div className="space-y-3.5">
      {/* Seletor de Subcategoria para Envio */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#ffc61e]" /> Categoria da foto a enviar:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {PROJECT_SUBCATEGORIES.map((subcat) => {
            const isSelected = selectedSubcategory === subcat.id;
            return (
              <button
                key={subcat.id}
                type="button"
                onClick={() => setSelectedSubcategory(subcat.id)}
                disabled={isProcessing}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all min-h-[38px] border ${
                  isSelected
                    ? 'bg-[#ffc61e] text-black border-[#ffc61e] font-extrabold shadow-sm'
                    : 'bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <CategoryIcon
                  id={subcat.id}
                  className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-black' : 'text-[#ffc61e]'}`}
                />
                <span className="truncate">{subcat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Área de Drag & Drop com Foco Acessível */}
      <div
        {...getRootProps()}
        tabIndex={0}
        role="button"
        aria-label="Área para soltar ou selecionar fotos do projeto"
        className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc61e] focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
          isDragActive
            ? 'border-[#ffc61e] bg-[#ffc61e]/10 scale-[1.01]'
            : isProcessing
            ? 'border-zinc-700 bg-zinc-950/50 cursor-not-allowed opacity-75'
            : 'border-zinc-800 bg-zinc-950/70 hover:border-[#ffc61e]/60 hover:bg-zinc-900/80'
        }`}
      >
        <input {...getInputProps()} aria-label="Upload de fotos de projeto" />

        {isProcessing ? (
          <div
            className="space-y-3 py-2 w-full max-w-xs mx-auto"
            role="progressbar"
            aria-live="polite"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress ? Math.round((progress.current / progress.total) * 100) : 0}
          >
            <Loader2 className="w-10 h-10 animate-spin text-[#ffc61e] mx-auto" />
            {progress && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-white">
                  {progress.stage === 'compressing' && 'Comprimindo foto'}
                  {progress.stage === 'uploading' && 'Enviando para o Storage'}
                  {progress.stage === 'saving' && 'Gravando no Banco'}
                  {' '}({progress.current} de {progress.total})
                </p>
                <p className="text-xs text-zinc-400 font-mono truncate">{progress.fileName}</p>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden mt-2">
                  <div
                    className="bg-[#ffc61e] h-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-[#ffc61e]/15 border border-[#ffc61e]/30 flex items-center justify-center text-[#ffc61e]">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-zinc-200">
                {isDragActive ? 'Solte os arquivos de projeto aqui...' : 'Arraste & Solte fotos do projeto aqui'}
              </p>
              <p className="text-xs text-zinc-400">
                ou <span className="text-[#ffc61e] font-semibold underline">clique para selecionar do computador</span> (Envio em lote)
              </p>
            </div>
          </>
        )}
      </div>

      {/* Feedbacks em Alerta */}
      {successFeedback && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successFeedback}</span>
        </div>
      )}

      {errorFeedback && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorFeedback}</span>
        </div>
      )}
    </div>
  );
}

