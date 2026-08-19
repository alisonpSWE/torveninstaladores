/**
 * Utilitário de Parsing e Normalização de CSV para Catálogo de Estoque
 * - Suporta delimitadores brasileiros comuns: Ponto e vírgula (;), Vírgula (,) e Tabulação (\t)
 * - Suporta aspas duplas escapadas ("...")
 * - Trata números decimais brasileiros (ex: "2,5" ➔ 2.5)
 * - Normaliza cabeçalhos comuns em planilhas do Excel
 */

export interface ParsedEstoqueItem {
  codigo: string;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade_saldo: number;
  estoque_minimo: number;
}

export interface InvalidEstoqueRow {
  rowNumber: number;
  raw: Record<string, string>;
  reason: string;
}

export interface CsvParseResult {
  validItems: ParsedEstoqueItem[];
  invalidRows: InvalidEstoqueRow[];
  totalRows: number;
  delimiter: string;
}

/**
 * Detecta o delimitador mais frequente nas primeiras linhas
 */
function detectDelimiter(text: string): string {
  const sample = text.slice(0, 4000);
  const semicolons = (sample.match(/;/g) || []).length;
  const commas = (sample.match(/,/g) || []).length;
  const tabs = (sample.match(/\t/g) || []).length;

  if (semicolons >= commas && semicolons >= tabs && semicolons > 0) return ';';
  if (tabs > commas && tabs > semicolons) return '\t';
  return ',';
}

/**
 * Divide uma linha CSV respeitando aspas
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Pula o escape
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Normaliza o nome do cabeçalho
 */
function normalizeHeaderName(header: string): string {
  const h = header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9_]/g, '')
    .trim();

  if (['codigo', 'cod', 'id', 'ref', 'sku', 'codigodoitem'].includes(h)) return 'codigo';
  if (['item', 'nome', 'descricao', 'produto', 'material', 'nomedoproduto'].includes(h)) return 'nome';
  if (['unidade', 'unid', 'und', 'un', 'medida', 'unidadedemedida'].includes(h)) return 'unidade';
  if (['quantidade', 'qtd', 'saldo', 'estoque', 'quantidadesaldo', 'qtdsaldo'].includes(h)) return 'quantidade_saldo';
  if (['categoria', 'grupo', 'tipo', 'setor', 'familiadoproduto'].includes(h)) return 'categoria';
  if (['estoqueminimo', 'minimo', 'min', 'qtdminima'].includes(h)) return 'estoque_minimo';

  return h;
}

/**
 * Converte string para número tratando vírgula decimal brasileira
 */
function parseBrazilianNumber(val: any, fallback: number = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;

  const clean = String(val)
    .trim()
    .replace(/\s+/g, '')
    .replace(/\.(?=\d{3})/g, '') // Remove pontos de milhar
    .replace(',', '.'); // Substitui vírgula decimal por ponto

  const num = parseFloat(clean);
  return isNaN(num) ? fallback : num;
}

/**
 * Executa o parse completo do conteúdo de texto CSV
 */
export function parseEstoqueCsv(csvText: string): CsvParseResult {
  const cleanText = csvText.replace(/^\uFEFF/, ''); // Remove BOM se presente
  const delimiter = detectDelimiter(cleanText);
  const lines = cleanText
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { validItems: [], invalidRows: [], totalRows: 0, delimiter };
  }

  // 1. Extração e mapeamento dos cabeçalhos
  const headerRaw = parseCsvLine(lines[0], delimiter);
  const headerMap: Record<number, string> = {};

  headerRaw.forEach((h, index) => {
    headerMap[index] = normalizeHeaderName(h);
  });

  const validItems: ParsedEstoqueItem[] = [];
  const invalidRows: InvalidEstoqueRow[] = [];

  // 2. Parse das linhas de dados
  for (let i = 1; i < lines.length; i++) {
    const rawCols = parseCsvLine(lines[i], delimiter);
    const rowObj: Record<string, string> = {};

    rawCols.forEach((col, index) => {
      const key = headerMap[index] || `col_${index}`;
      rowObj[key] = col;
    });

    const codigo = (rowObj['codigo'] || '').trim().toUpperCase();
    const nome = (rowObj['nome'] || '').trim();
    const categoria = (rowObj['categoria'] || 'Geral').trim() || 'Geral';
    const unidade = (rowObj['unidade'] || 'un').trim().toLowerCase() || 'un';
    const saldo = parseBrazilianNumber(rowObj['quantidade_saldo'], 0);
    const minimo = parseBrazilianNumber(rowObj['estoque_minimo'], 0);

    // Validação de obrigatoriedade
    if (!codigo && !nome) {
      // Linha vazia ou irrelevante
      continue;
    }

    if (!codigo) {
      invalidRows.push({
        rowNumber: i + 1,
        raw: rowObj,
        reason: 'Código do produto ausente',
      });
      continue;
    }

    if (!nome) {
      invalidRows.push({
        rowNumber: i + 1,
        raw: rowObj,
        reason: 'Nome/descrição do produto ausente',
      });
      continue;
    }

    validItems.push({
      codigo,
      nome,
      categoria,
      unidade,
      quantidade_saldo: saldo,
      estoque_minimo: minimo,
    });
  }

  return {
    validItems,
    invalidRows,
    totalRows: lines.length - 1,
    delimiter,
  };
}
