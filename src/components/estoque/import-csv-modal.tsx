'use client';

import React, { useState, useRef } from 'react';
import { parseEstoqueCsv, ParsedEstoqueItem, InvalidEstoqueRow } from '@/lib/csv-parser';
import { useBatchUpsertEstoque } from '@/lib/query/hooks';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Loader2,
  ShieldCheck,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';

interface ImportCsvModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ImportCsvModal({ open, onOpenChange, onSuccess }: ImportCsvModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [validItems, setValidItems] = useState<ParsedEstoqueItem[]>([]);
  const [invalidRows, setInvalidRows] = useState<InvalidEstoqueRow[]>([]);
  const [detectedDelimiter, setDetectedDelimiter] = useState<string>(',');
  const [overwriteBalance, setOverwriteBalance] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchUpsertMutation = useBatchUpsertEstoque();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      processFile(dropped);
    }
  };

  const processFile = (file: File) => {
    setErrorMsg(null);
    setFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setErrorMsg('Arquivo vazio.');
          return;
        }

        const result = parseEstoqueCsv(text);
        if (result.validItems.length === 0) {
          setErrorMsg('Nenhum produto válido foi identificado no arquivo CSV. Verifique os cabeçalhos.');
          return;
        }

        setValidItems(result.validItems);
        setInvalidRows(result.invalidRows);
        setDetectedDelimiter(result.delimiter);
        setStep('preview');
      } catch (err: any) {
        setErrorMsg(`Erro ao processar CSV: ${err.message}`);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Falha ao ler o arquivo selecionado.');
    };

    reader.readAsText(file, 'UTF-8');
  };

  const handleExecuteImport = async () => {
    if (validItems.length === 0) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      await batchUpsertMutation.mutateAsync({
        items: validItems,
        overwriteBalance,
      });

      setStep('success');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao sincronizar produtos com o banco.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidItems([]);
    setInvalidRows([]);
    setErrorMsg(null);
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-white">
          <FileSpreadsheet className="w-5 h-5 text-[#ffc61e]" />
          <span>Importar Catálogo via Planilha CSV</span>
        </DialogTitle>
        <DialogDescription>
          Faça upload de planilhas do Excel para cadastrar ou atualizar múltiplos itens em lote.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 mt-2">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ETAPA 1: Upload / Dropzone */}
        {step === 'upload' && (
          <div className="space-y-3">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 hover:border-[#ffc61e] bg-zinc-950/80 hover:bg-zinc-900/60 transition-all rounded-2xl p-8 text-center cursor-pointer flex flex-col items-center justify-center space-y-3 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-[#ffc61e] group-hover:scale-105 transition-all">
                <UploadCloud className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold text-zinc-200">
                  Clique para selecionar ou arraste o arquivo .CSV aqui
                </p>
                <p className="text-xs text-zinc-400">
                  Formatos aceitos: .csv (delimitadores vírgula, ponto e vírgula ou tab)
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Dica de Formato de Cabeçalho */}
            <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-850 text-xs space-y-1.5">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                Colunas Reconhecidas Automaticamente:
              </span>
              <p className="text-xs text-zinc-300 font-mono">
                Código • Nome/Item • Categoria • Unidade • Quantidade/Saldo • Estoque Mínimo
              </p>
            </div>
          </div>
        )}

        {/* ETAPA 2: Pré-visualização & Opções de Conflito */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Resumo do Parse */}
            <div className="flex items-center justify-between bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#ffc61e]" />
                <span className="font-bold text-white truncate max-w-[200px]">
                  {file?.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold">
                  {validItems.length} itens válidos
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  Delim: &quot;{detectedDelimiter === '\t' ? 'TAB' : detectedDelimiter}&quot;
                </span>
              </div>
            </div>

            {/* Alerta de Linhas Ignoradas / Inválidas */}
            {invalidRows.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>{invalidRows.length} linha(s) ignorada(s) por falta de código ou nome:</span>
                </div>
                <div className="max-h-20 overflow-y-auto text-xs text-amber-400/90 pl-5 list-disc">
                  {invalidRows.slice(0, 5).map((inv, idx) => (
                    <div key={idx}>Linha {inv.rowNumber}: {inv.reason}</div>
                  ))}
                  {invalidRows.length > 5 && <div>...e mais {invalidRows.length - 5} linha(s)</div>}
                </div>
              </div>
            )}

            {/* Tabela de Pré-visualização com Scroll */}
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/80">
              <div className="max-h-48 overflow-y-auto divide-y divide-zinc-800/60 text-xs">
                <div className="sticky top-0 bg-zinc-900 grid grid-cols-12 gap-2 p-2.5 font-bold text-zinc-300 text-xs border-b border-zinc-800">
                  <span className="col-span-3">Código</span>
                  <span className="col-span-4">Nome</span>
                  <span className="col-span-2">Cat.</span>
                  <span className="col-span-1">Und</span>
                  <span className="col-span-2 text-right">Qtd</span>
                </div>
                {validItems.slice(0, 50).map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 p-2 text-zinc-300 items-center hover:bg-zinc-900/40">
                    <span className="col-span-3 font-mono font-bold text-[#ffc61e] truncate">{item.codigo}</span>
                    <span className="col-span-4 text-white truncate" title={item.nome}>{item.nome}</span>
                    <span className="col-span-2 text-zinc-400 truncate">{item.categoria}</span>
                    <span className="col-span-1 text-zinc-400">{item.unidade}</span>
                    <span className="col-span-2 text-right font-mono font-bold">{item.quantidade_saldo}</span>
                  </div>
                ))}
                {validItems.length > 50 && (
                  <div className="p-2 text-center text-zinc-400 text-xs italic bg-zinc-950">
                    + {validItems.length - 50} itens adicionais prontos para importação
                  </div>
                )}
              </div>
            </div>

            {/* Opções de Conflito de Saldo */}
            <div className="space-y-2 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                Comportamento de Atualização do Saldo:
              </span>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="balanceOption"
                  checked={!overwriteBalance}
                  onChange={() => setOverwriteBalance(false)}
                  className="mt-0.5 accent-[#ffc61e]"
                />
                <div>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Preservar saldo atual no galpão (Recomendado)
                  </span>
                  <p className="text-xs text-zinc-400">
                    Atualiza apenas nomes, categorias e unidades. Mantém o saldo real físico já movimentado no almoxarifado.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs pt-1.5 border-t border-zinc-850">
                <input
                  type="radio"
                  name="balanceOption"
                  checked={overwriteBalance}
                  onChange={() => setOverwriteBalance(true)}
                  className="mt-0.5 accent-[#ffc61e]"
                />
                <div>
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Sobrescrever saldo com os valores da planilha
                  </span>
                  <p className="text-xs text-zinc-400">
                    Substitui o saldo de todos os produtos pelos números presentes nesta planilha.
                  </p>
                </div>
              </label>
            </div>

            {/* Ações */}
            <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                disabled={isProcessing}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Trocar Arquivo</span>
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="min-h-[44px]"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={isProcessing || validItems.length === 0}
                  className="bg-[#ffc61e] text-black hover:bg-[#e5b010] font-extrabold min-h-[44px] px-5 flex items-center gap-2 shadow-lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Importando {validItems.length} itens...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirmar Importação</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 3: Sucesso */}
        {step === 'success' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Catálogo Atualizado com Sucesso!</h3>
              <p className="text-xs text-zinc-400">
                {validItems.length} produto(s) foram sincronizados no banco de dados.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleClose}
              className="bg-[#ffc61e] text-black hover:bg-[#e5b010] font-extrabold px-6 min-h-[44px]"
            >
              Concluir
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
