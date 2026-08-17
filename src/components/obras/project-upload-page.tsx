'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import { useQueryClient } from '@tanstack/react-query';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { useObra, useObraPhotos, useDeletePhoto } from '@/lib/query/hooks';
import { PROJECT_SUBCATEGORIES, ProjectSubcategoryId, ObraPhoto } from '@/lib/supabase/types';
import { compressImage } from '@/lib/image-compressor';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  X,
  Maximize2,
  Folder,
  Shield,
  Layers,
  Sparkles,
  Plus,
  Tag,
  GripVertical,
  Filter,
} from 'lucide-react';

export interface CustomTag {
  id: string;
  label: string;
  icon: string;
  appSheetField?: string;
  isCustom?: boolean;
}

interface StagedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  subcategory: ProjectSubcategoryId | string;
}

interface ProjectUploadPageProps {
  idObra: string | number;
}

export function ProjectUploadPage({ idObra }: ProjectUploadPageProps) {
  const obraIdNum = Number(idObra);
  const { data: obra, isLoading: isLoadingObra } = useObra(obraIdNum);
  const { data: photosData, isLoading: isLoadingPhotos } = useObraPhotos(obraIdNum);
  const deletePhotoMutation = useDeletePhoto();
  const queryClient = useQueryClient();
  const supabase = createClient();

  const projetoPhotos = photosData?.projetoPhotos || [];

  // Estado das Tags (iniciado com as padrões e permite adicionar/remover dinamicamente)
  const [tags, setTags] = useState<CustomTag[]>([
    ...PROJECT_SUBCATEGORIES.map((s) => ({ ...s, isCustom: false })),
  ]);
  const [newTagInput, setNewTagInput] = useState('');
  const [activeFilterTag, setActiveFilterTag] = useState<string | null>(null);

  // Estado das fotos na área de staging (preparação de upload)
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);

  // Fila de upload
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
    stage: 'compressing' | 'uploading' | 'saving';
  } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [updatingPhotoId, setUpdatingPhotoId] = useState<string | null>(null);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Adiciona nova tag personalizada
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagInput.trim();
    if (!trimmed) return;

    const slugId = trimmed
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!slugId) return;

    if (tags.some((t) => t.id === slugId)) {
      alert(`A tag "${trimmed}" já existe.`);
      return;
    }

    const newTag: CustomTag = {
      id: slugId,
      label: trimmed,
      icon: '🏷️',
      isCustom: true,
    };

    setTags((prev) => [...prev, newTag]);
    setNewTagInput('');
  };

  // Remove tag da barra lateral
  const handleRemoveTag = (tagId: string) => {
    if (tagId === 'geral') {
      alert('A tag "Geral" é obrigatória e não pode ser removida.');
      return;
    }

    setTags((prev) => prev.filter((t) => t.id !== tagId));

    if (activeFilterTag === tagId) {
      setActiveFilterTag(null);
    }

    // Se houver fotos staged com essa tag, reverte para 'geral'
    setStagedPhotos((prev) =>
      prev.map((photo) =>
        photo.subcategory === tagId ? { ...photo, subcategory: 'geral' } : photo
      )
    );
  };

  // Dropzone callback: adiciona arquivos na área de staging com subcategoria padrão 'geral'
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;

    setFeedback(null);
    const newStaged: StagedPhoto[] = acceptedFiles.map((file, index) => ({
      id: `staged_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      subcategory: 'geral',
    }));

    setStagedPhotos((prev) => [...prev, ...newStaged]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic'],
    },
    disabled: isProcessing,
  });

  // Atualiza subcategoria de foto no staging (local)
  const handleSetStagedSubcategory = (stagedId: string, subcategory: string) => {
    setStagedPhotos((prev) =>
      prev.map((item) => (item.id === stagedId ? { ...item, subcategory } : item))
    );
  };

  // Atualiza subcategoria de foto já salva na nuvem (Supabase DB)
  const handleUpdateCloudPhotoSubcategory = async (photoId: string, subcategory: string) => {
    setUpdatingPhotoId(photoId);
    try {
      const { error } = await (supabase.from('obra_photos' as any) as any)
        .update({ subcategory })
        .eq('id', photoId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['obra-photos', obraIdNum] });
    } catch (err: any) {
      alert(`Falha ao atualizar categoria da foto: ${err.message}`);
    } finally {
      setUpdatingPhotoId(null);
    }
  };

  // Remove uma foto do staging
  const handleRemoveStagedPhoto = (stagedId: string) => {
    setStagedPhotos((prev) => {
      const target = prev.find((item) => item.id === stagedId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== stagedId);
    });
  };

  // Limpa toda a fila de staging
  const handleClearStaging = () => {
    stagedPhotos.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setStagedPhotos([]);
    setFeedback(null);
  };

  // Envio Sequencial (Fila for...of para evitar sobrecarga de CPU)
  const handleUploadAllStaged = async () => {
    if (stagedPhotos.length === 0 || !obraIdNum) return;

    setIsProcessing(true);
    setFeedback(null);

    const totalFiles = stagedPhotos.length;
    let successCount = 0;
    let failCount = 0;

    let index = 0;
    for (const staged of stagedPhotos) {
      index++;
      try {
        // 1. Compressão via WebWorker
        setProgress({
          current: index,
          total: totalFiles,
          fileName: staged.file.name,
          stage: 'compressing',
        });
        const compressedFile = await compressImage(staged.file);

        // 2. Upload Storage
        setProgress({
          current: index,
          total: totalFiles,
          fileName: staged.file.name,
          stage: 'uploading',
        });

        const cleanFileName = staged.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `obra_${obraIdNum}/projeto/${Date.now()}_${index}_${cleanFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(storagePath, compressedFile, {
            contentType: compressedFile.type || 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Erro no Storage: ${uploadError.message}`);
        }

        // 3. Resgate URL pública
        const { data: publicUrlData } = supabase.storage
          .from('photos')
          .getPublicUrl(storagePath);

        const publicUrl = publicUrlData.publicUrl;

        // 4. Inserção no banco com categoria 'projeto' e subcategoria
        setProgress({
          current: index,
          total: totalFiles,
          fileName: staged.file.name,
          stage: 'saving',
        });

        const insertPayload: any = {
          id_obra: obraIdNum,
          storage_path: storagePath,
          public_url: publicUrl,
          file_name: staged.file.name,
          content_type: compressedFile.type || 'image/jpeg',
          size_bytes: compressedFile.size,
          category: 'projeto',
          subcategory: staged.subcategory || 'geral',
        };

        const { error: dbError } = await (supabase.from('obra_photos' as any) as any).insert(insertPayload);

        if (dbError) {
          throw new Error(`Erro no banco: ${dbError.message}`);
        }

        successCount++;
      } catch (err: any) {
        failCount++;
        console.error(`[PROJECT UPLOAD] Falha no arquivo ${staged.file.name}:`, err);
      }
    }

    setIsProcessing(false);
    setProgress(null);

    // Limpa previews da memória
    stagedPhotos.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setStagedPhotos([]);

    queryClient.invalidateQueries({ queryKey: ['obra-photos', obraIdNum] });

    if (failCount === 0) {
      setFeedback({
        type: 'success',
        message: `${successCount} foto(s) de projeto enviada(s) e gravada(s) na nuvem com sucesso!`,
      });
    } else {
      setFeedback({
        type: 'error',
        message: `${successCount} enviada(s) com sucesso, mas ${failCount} falharam. Verifique a conexão e tente novamente.`,
      });
    }
  };

  // Exclusão de foto já enviada (Hard Delete)
  const handleDeleteCloudPhoto = async (photo: ObraPhoto) => {
    const confirmed = window.confirm(
      `Excluir permanentemente a foto "${photo.file_name || 'do projeto'}"?`
    );
    if (!confirmed) return;

    setDeletingPhotoId(photo.id);
    try {
      await deletePhotoMutation.mutateAsync({
        photoId: photo.id,
        storagePath: photo.storage_path,
        idObra: obraIdNum,
      });
    } catch (err: any) {
      alert(`Falha ao excluir foto: ${err.message}`);
    } finally {
      setDeletingPhotoId(null);
    }
  };

  // Contadores de fotos por tag (staged + nuvem)
  const tagCounts = useMemo(() => {
    const counts: Record<string, { total: number; staged: number; cloud: number }> = {};
    tags.forEach((t) => {
      counts[t.id] = { total: 0, staged: 0, cloud: 0 };
    });

    stagedPhotos.forEach((p) => {
      const sub = p.subcategory || 'geral';
      if (!counts[sub]) counts[sub] = { total: 0, staged: 0, cloud: 0 };
      counts[sub].staged += 1;
      counts[sub].total += 1;
    });

    projetoPhotos.forEach((p) => {
      const sub = p.subcategory || 'geral';
      if (!counts[sub]) counts[sub] = { total: 0, staged: 0, cloud: 0 };
      counts[sub].cloud += 1;
      counts[sub].total += 1;
    });

    return counts;
  }, [tags, stagedPhotos, projetoPhotos]);

  const totalPhotosCount = stagedPhotos.length + projetoPhotos.length;

  // Filtragem da Galeria Unificada
  const filteredStagedPhotos = useMemo(() => {
    if (!activeFilterTag) return stagedPhotos;
    return stagedPhotos.filter((p) => (p.subcategory || 'geral') === activeFilterTag);
  }, [stagedPhotos, activeFilterTag]);

  const filteredCloudPhotos = useMemo(() => {
    if (!activeFilterTag) return projetoPhotos;
    return projetoPhotos.filter((p) => (p.subcategory || 'geral') === activeFilterTag);
  }, [projetoPhotos, activeFilterTag]);

  // Slides para o Lightbox (apenas fotos salvas)
  const lightboxSlides = projetoPhotos.map((photo) => {
    const tagInfo = tags.find((t) => t.id === photo.subcategory);
    return {
      src: photo.public_url,
      alt: `${tagInfo ? `${tagInfo.icon} ${tagInfo.label} - ` : ''}${photo.file_name || 'Foto do Projeto'}`,
    };
  });

  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-zinc-100 pb-28 w-full">
      {/* Header Fixo PC Full-Width */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-zinc-800 px-4 sm:px-8 py-3.5 shadow-xl w-full">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/obra/${idObra}`}
              className="inline-flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-white px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-400" />
              <span>Voltar para a Obra</span>
            </Link>

            <div className="border-l border-zinc-800 pl-4">
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Workspace de Fotos do Projeto
                </h1>
                <span className="text-[10px] font-extrabold font-mono uppercase bg-[#ffc61e]/20 text-[#ffc61e] border border-[#ffc61e]/50 px-2.5 py-0.5 rounded-full tracking-wider shadow-sm flex items-center gap-1">
                  <Shield className="w-3 h-3 text-[#ffc61e]" /> ADMIN
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                {obra?.cliente || `Obra #${idObra}`} • {obra?.cidade || ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-[#ffc61e] bg-[#ffc61e]/15 px-3 py-1.5 rounded-xl border border-[#ffc61e]/30 font-bold">
              #{idObra}
            </span>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* WORKSPACE PRINCIPAL: LAYOUT EM 2 COLUNAS (SIDEBAR + GALERIA UNIFICADA)   */}
      {/* ========================================================================= */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 flex-1 flex flex-col lg:flex-row gap-6 items-start">
        
        {/* ----------------------------------------------------------------------- */}
        {/* COLUNA ESQUERDA: SIDEBAR DE TAGS ARRASTÁVEIS E FILTRO (STICKY)          */}
        {/* ----------------------------------------------------------------------- */}
        <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-20 space-y-4">
          <Card className="p-4 bg-zinc-900/90 border-zinc-800 rounded-2xl shadow-xl space-y-4">
            <div className="space-y-1 pb-2 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#ffc61e]" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                    Tags de Engenharia
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800">
                  {totalPhotosCount} fotos
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight">
                Arraste uma tag e solte em cima de qualquer foto para categorizá-la.
              </p>
            </div>

            {/* Filtro: Todas as fotos */}
            <button
              type="button"
              onClick={() => setActiveFilterTag(null)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all border ${
                activeFilterTag === null
                  ? 'bg-[#ffc61e] text-black border-[#ffc61e] shadow-md font-extrabold'
                  : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:bg-zinc-850 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5" />
                <span>Todas as Fotos</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeFilterTag === null ? 'bg-black/20 text-black' : 'bg-zinc-900 text-zinc-400'
              }`}>
                {totalPhotosCount}
              </span>
            </button>

            {/* Lista Vertical de Tags Arrastáveis */}
            <div className="space-y-1.5 max-h-[calc(100vh-340px)] overflow-y-auto pr-1 no-scrollbar">
              {tags.map((tag) => {
                const count = tagCounts[tag.id]?.total || 0;
                const isFilterActive = activeFilterTag === tag.id;

                return (
                  <div
                    key={tag.id}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/tag-id', tag.id);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => setActiveFilterTag((prev) => (prev === tag.id ? null : tag.id))}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all border select-none group cursor-grab active:cursor-grabbing shadow-sm ${
                      isFilterActive
                        ? 'bg-[#ffc61e] text-black border-[#ffc61e] font-extrabold shadow-md'
                        : 'bg-zinc-950 text-zinc-200 border-zinc-800 hover:border-[#ffc61e]/70 hover:bg-zinc-900'
                    }`}
                    title="Arraste para uma foto para categorizar, ou clique para filtrar"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className={`w-3.5 h-3.5 shrink-0 ${
                        isFilterActive ? 'text-black/60' : 'text-zinc-600 group-hover:text-[#ffc61e]'
                      }`} />
                      <span className="text-base shrink-0">{tag.icon}</span>
                      <span className="truncate">{tag.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isFilterActive
                          ? 'bg-black/20 text-black'
                          : count > 0
                          ? 'bg-[#ffc61e]/15 text-[#ffc61e] border border-[#ffc61e]/30'
                          : 'bg-zinc-900 text-zinc-500'
                      }`}>
                        {count}
                      </span>

                      {tag.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTag(tag.id);
                          }}
                          className={`p-1 rounded-md transition-colors ${
                            isFilterActive
                              ? 'hover:bg-black/20 text-black'
                              : 'hover:bg-red-500/20 hover:text-red-400 text-zinc-500'
                          }`}
                          title="Remover tag customizada"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Formulário Compacto para Criar Nova Tag */}
            <form onSubmit={handleAddTag} className="pt-2 border-t border-zinc-800 space-y-2">
              <span className="text-[10px] font-bold uppercase text-zinc-400 block px-0.5">
                Nova Tag Personalizada
              </span>
              <div className="flex items-center gap-1.5">
                <Input
                  type="text"
                  placeholder="Nome da tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  className="h-8 bg-zinc-950 border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 rounded-lg focus:border-[#ffc61e]"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newTagInput.trim()}
                  className="h-8 px-2.5 bg-[#ffc61e] hover:bg-[#e5b010] text-black font-extrabold text-xs rounded-lg shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </form>
          </Card>
        </aside>

        {/* ----------------------------------------------------------------------- */}
        {/* COLUNA DIREITA: GALERIA UNIFICADA + DROPZONE NO TOPO                     */}
        {/* ----------------------------------------------------------------------- */}
        <div className="flex-1 w-full space-y-6">

          {/* 1. DROPZONE FULL-WIDTH */}
          <div
            {...getRootProps()}
            className={`p-8 sm:p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center space-y-3 shadow-sm ${
              isDragActive
                ? 'border-[#ffc61e] bg-[#ffc61e]/15 scale-[1.005]'
                : isProcessing
                ? 'border-zinc-700 bg-zinc-950/50 cursor-not-allowed opacity-75'
                : 'border-zinc-800 bg-zinc-950/80 hover:border-[#ffc61e]/70 hover:bg-zinc-900/60'
            }`}
          >
            <input {...getInputProps()} />

            {isProcessing ? (
              <div className="space-y-3 py-2">
                <Loader2 className="w-10 h-10 animate-spin text-[#ffc61e] mx-auto" />
                {progress && (
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <p className="text-xs font-bold text-white">
                      {progress.stage === 'compressing' && 'Comprimindo foto'}
                      {progress.stage === 'uploading' && 'Enviando para o Storage'}
                      {progress.stage === 'saving' && 'Gravando na Nuvem'}
                      {' '}({progress.current} de {progress.total})
                    </p>
                    <p className="text-[11px] text-zinc-400 font-mono truncate">{progress.fileName}</p>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden mt-1 border border-zinc-700">
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
                <div className="w-12 h-12 rounded-xl bg-[#ffc61e]/15 border border-[#ffc61e]/30 flex items-center justify-center text-[#ffc61e] shadow-sm">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-zinc-100">
                    {isDragActive
                      ? 'Solte as fotos aqui para adicionar à galeria...'
                      : 'Arraste & Solte as fotos do projeto aqui'}
                  </p>
                  <p className="text-xs text-zinc-400">
                    ou <span className="text-[#ffc61e] font-semibold underline">clique para selecionar do computador</span> (Envio em lote)
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Feedback de Status */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* 2. BARRA DE STATUS DA FILA (QUANDO HOUVER STAGED) */}
          {stagedPhotos.length > 0 && (
            <div className="p-4 rounded-2xl bg-zinc-900 border border-[#ffc61e]/40 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#ffc61e]/20 flex items-center justify-center text-[#ffc61e] shrink-0 font-extrabold text-xs">
                  {stagedPhotos.length}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {stagedPhotos.length} foto(s) na fila aguardando upload
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Arraste as tags para os cards abaixo para categorizar e clique em Enviar.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearStaging}
                  disabled={isProcessing}
                  className="h-9 px-3 text-xs border-zinc-700 bg-zinc-950 text-zinc-300 hover:text-white"
                >
                  Limpar Fila
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUploadAllStaged}
                  disabled={isProcessing}
                  className="h-9 px-4 bg-[#ffc61e] hover:bg-[#e5b010] text-black font-extrabold text-xs rounded-xl shadow-md"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Enviando...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Enviar {stagedPhotos.length} Foto(s)
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* 3. GRADE CONTÍNUA UNIFICADA DE FOTOS */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs text-zinc-400 font-semibold">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-[#ffc61e]" />
                <span className="text-white font-bold">
                  {activeFilterTag
                    ? `Galeria Filtrada: ${tags.find((t) => t.id === activeFilterTag)?.label || activeFilterTag}`
                    : 'Galeria Geral do Projeto'}
                </span>
                <span>({filteredStagedPhotos.length + filteredCloudPhotos.length} fotos)</span>
              </div>
              <span className="text-[11px] text-zinc-500">Arraste qualquer tag para o card</span>
            </div>

            {filteredStagedPhotos.length === 0 && filteredCloudPhotos.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-2">
                <Folder className="w-10 h-10 text-zinc-600 mx-auto" />
                <p className="text-sm text-zinc-400 font-medium">
                  {activeFilterTag
                    ? 'Nenhuma foto com esta tag ainda.'
                    : 'Nenhuma foto de projeto cadastrada para esta obra.'}
                </p>
                <p className="text-xs text-zinc-500">
                  Arraste novos arquivos no topo para começar.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                
                {/* ------------------------------------------------------------- */}
                {/* A. CARDS DE FOTOS PENDENTES NO STAGING (FILA DE ENVIO)        */}
                {/* ------------------------------------------------------------- */}
                {filteredStagedPhotos.map((item) => {
                  const currentTag = tags.find((t) => t.id === item.subcategory) || {
                    id: 'geral',
                    label: 'Geral',
                    icon: '📁',
                  };
                  const isCardDragOver = dragOverCardId === item.id;

                  return (
                    <Card
                      key={item.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                      }}
                      onDragEnter={() => setDragOverCardId(item.id)}
                      onDragLeave={() => setDragOverCardId((prev) => (prev === item.id ? null : prev))}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverCardId(null);
                        const droppedTagId = e.dataTransfer.getData('application/tag-id');
                        if (droppedTagId) {
                          handleSetStagedSubcategory(item.id, droppedTagId);
                        }
                      }}
                      className={`p-2.5 bg-zinc-950 rounded-2xl space-y-2 relative group shadow-md transition-all border-2 border-dashed ${
                        isCardDragOver
                          ? 'border-[#ffc61e] ring-4 ring-[#ffc61e]/50 bg-[#ffc61e]/15 scale-[1.03]'
                          : 'border-[#ffc61e]/60 hover:border-[#ffc61e]'
                      }`}
                    >
                      {/* Overlay ao passar tag arrastada por cima */}
                      {isCardDragOver && (
                        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center border-2 border-[#ffc61e] pointer-events-none animate-pulse">
                          <Sparkles className="w-7 h-7 text-[#ffc61e]" />
                          <span className="text-[11px] font-extrabold text-[#ffc61e] mt-1">
                            Solte a tag aqui!
                          </span>
                        </div>
                      )}

                      {/* Header do Card: Tag Atual + Botão Descartar da Fila */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 text-[10px] font-extrabold bg-[#ffc61e] text-black px-2 py-0.5 rounded-md truncate shadow-sm">
                          <span>{currentTag.icon}</span>
                          <span className="truncate">{currentTag.label}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveStagedPhoto(item.id)}
                          disabled={isProcessing}
                          className="w-6 h-6 rounded-md bg-zinc-900 hover:bg-red-600 text-zinc-400 hover:text-white flex items-center justify-center transition-all border border-zinc-800 shrink-0"
                          title="Remover da fila"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Miniatura da Foto Staged */}
                      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black border border-zinc-850">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono text-[#ffc61e] font-bold border border-[#ffc61e]/40">
                          🟡 Fila
                        </div>
                      </div>

                      {/* Nome do arquivo */}
                      <p className="text-[11px] font-medium text-zinc-300 truncate px-0.5" title={item.file.name}>
                        {item.file.name}
                      </p>

                      {/* Seletor rápido de tags por clique */}
                      <div className="flex flex-wrap gap-1 pt-0.5 max-h-16 overflow-y-auto no-scrollbar">
                        {tags.map((tag) => {
                          const isSelected = item.subcategory === tag.id;
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => handleSetStagedSubcategory(item.id, tag.id)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all border ${
                                isSelected
                                  ? 'bg-[#ffc61e] text-black border-[#ffc61e]'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                              }`}
                            >
                              {tag.icon} {tag.label}
                            </button>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}

                {/* ------------------------------------------------------------- */}
                {/* B. CARDS DE FOTOS JÁ SALVAS NA NUVEM (SUPABASE)               */}
                {/* ------------------------------------------------------------- */}
                {filteredCloudPhotos.map((photo) => {
                  const currentTag = tags.find((t) => t.id === photo.subcategory) || {
                    id: 'geral',
                    label: 'Geral',
                    icon: '📁',
                  };
                  const isCardDragOver = dragOverCardId === photo.id;
                  const isUpdatingThis = updatingPhotoId === photo.id;
                  const isDeletingThis = deletingPhotoId === photo.id;
                  const globalIndex = projetoPhotos.findIndex((p) => p.id === photo.id);

                  return (
                    <Card
                      key={photo.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                      }}
                      onDragEnter={() => setDragOverCardId(photo.id)}
                      onDragLeave={() => setDragOverCardId((prev) => (prev === photo.id ? null : prev))}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverCardId(null);
                        const droppedTagId = e.dataTransfer.getData('application/tag-id');
                        if (droppedTagId) {
                          handleUpdateCloudPhotoSubcategory(photo.id, droppedTagId);
                        }
                      }}
                      className={`p-2.5 bg-zinc-950 rounded-2xl space-y-2 relative group shadow-md transition-all border ${
                        isCardDragOver
                          ? 'border-[#ffc61e] ring-4 ring-[#ffc61e]/50 bg-[#ffc61e]/15 scale-[1.03]'
                          : 'border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {/* Overlay ao passar tag arrastada por cima */}
                      {isCardDragOver && (
                        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center border-2 border-[#ffc61e] pointer-events-none animate-pulse">
                          <Sparkles className="w-7 h-7 text-[#ffc61e]" />
                          <span className="text-[11px] font-extrabold text-[#ffc61e] mt-1">
                            Atribuir tag à foto salva!
                          </span>
                        </div>
                      )}

                      {/* Header do Card: Tag Atual + Botão Delete */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold bg-zinc-900 border border-zinc-750 text-zinc-200 px-2 py-0.5 rounded-md truncate shadow-sm">
                          {isUpdatingThis ? (
                            <Loader2 className="w-3 h-3 animate-spin text-[#ffc61e]" />
                          ) : (
                            <span>{currentTag.icon}</span>
                          )}
                          <span className="truncate">{currentTag.label}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteCloudPhoto(photo)}
                          disabled={isDeletingThis}
                          className="w-6 h-6 rounded-md bg-zinc-900 hover:bg-red-600 text-zinc-400 hover:text-white flex items-center justify-center transition-all border border-zinc-800 shrink-0"
                          title="Excluir foto permanentemente (Admin)"
                        >
                          {isDeletingThis ? (
                            <Loader2 className="w-3 h-3 animate-spin text-red-400" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Miniatura da Foto Salva com Lightbox ao Clicar */}
                      <div
                        onClick={() => handleOpenLightbox(globalIndex >= 0 ? globalIndex : 0)}
                        className="relative aspect-square w-full rounded-xl overflow-hidden bg-black border border-zinc-850 cursor-pointer group-hover:border-[#ffc61e]/60 transition-all"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.public_url}
                          alt={photo.file_name || 'Foto do Projeto'}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                          <span className="text-[10px] text-white font-bold flex items-center gap-1">
                            <Maximize2 className="w-3 h-3" /> Ampliar
                          </span>
                        </div>
                        <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono text-emerald-400 font-bold border border-emerald-500/30">
                          🟢 Nuvem
                        </div>
                      </div>

                      {/* Nome do arquivo */}
                      <p className="text-[11px] font-medium text-zinc-300 truncate px-0.5" title={photo.file_name || 'Foto'}>
                        {photo.file_name || 'Foto'}
                      </p>

                      {/* Seletor rápido de tags por clique para fotos salvas */}
                      <div className="flex flex-wrap gap-1 pt-0.5 max-h-16 overflow-y-auto no-scrollbar">
                        {tags.map((tag) => {
                          const isSelected = (photo.subcategory || 'geral') === tag.id;
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => handleUpdateCloudPhotoSubcategory(photo.id, tag.id)}
                              disabled={isUpdatingThis}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all border ${
                                isSelected
                                  ? 'bg-[#ffc61e] text-black border-[#ffc61e]'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                              }`}
                            >
                              {tag.icon} {tag.label}
                            </button>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Lightbox para Visualização em Tela Cheia */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={lightboxSlides}
      />
    </div>
  );
}
