import ExcelJS from "exceljs";
import { isValidCpfCnpj, onlyDigits } from "@/lib/validation/cpf-cnpj";

export const CLIENT_COLUMNS = [
  { header: "Tipo (PF ou PJ)", key: "tipo_pessoa" },
  { header: "CPF/CNPJ", key: "cpf_cnpj" },
  { header: "Nome / Razão Social", key: "nome_razao_social" },
  { header: "Nome Fantasia", key: "nome_fantasia" },
  { header: "E-mail", key: "email" },
  { header: "Telefone", key: "telefone" },
  { header: "Logradouro", key: "logradouro" },
  { header: "Número", key: "numero" },
  { header: "Complemento", key: "complemento" },
  { header: "Bairro", key: "bairro" },
  { header: "Município", key: "municipio" },
  { header: "UF", key: "uf" },
  { header: "CEP", key: "cep" },
] as const;

const EXAMPLE_ROW = [
  "PJ",
  "12.345.678/0001-95",
  "Empresa Exemplo Ltda",
  "Exemplo",
  "contato@exemplo.com.br",
  "(11) 91234-5678",
  "Av. Paulista",
  "1000",
  "Sala 10",
  "Bela Vista",
  "São Paulo",
  "SP",
  "01310-100",
];

export async function buildClientsTemplate(): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Clientes");

  sheet.columns = CLIENT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: 24 }));
  sheet.addRow(EXAMPLE_ROW);
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(2).font = { italic: true, color: { argb: "FF6B6A63" } };

  return workbook.xlsx.writeBuffer();
}

export interface ParsedClientRow {
  rowNumber: number;
  tipo_pessoa: string;
  cpf_cnpj: string;
  nome_razao_social: string;
  nome_fantasia: string;
  email: string;
  telefone: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const HEADER_LOOKUP = new Map(CLIENT_COLUMNS.map((c) => [normalizeHeader(c.header), c.key]));

export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function parseClientsWorkbook(buffer: ArrayBuffer): Promise<ParsedClientRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const colIndexToKey = new Map<number, string>();
  headerRow.eachCell((cell, colNumber) => {
    const key = HEADER_LOOKUP.get(normalizeHeader(cell.value));
    if (key) colIndexToKey.set(colNumber, key);
  });

  const rows: ParsedClientRow[] = [];
  const lastRow = Math.min(sheet.rowCount, MAX_IMPORT_ROWS + 1);

  for (let r = 2; r <= lastRow; r++) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;

    const record: Record<string, string> = {};
    for (const [colNumber, key] of colIndexToKey) {
      record[key] = String(row.getCell(colNumber).value ?? "").trim();
    }
    if (!record.cpf_cnpj && !record.nome_razao_social) continue; // linha em branco

    rows.push({
      rowNumber: r,
      tipo_pessoa: (record.tipo_pessoa ?? "").toUpperCase(),
      cpf_cnpj: onlyDigits(record.cpf_cnpj ?? ""),
      nome_razao_social: record.nome_razao_social ?? "",
      nome_fantasia: record.nome_fantasia ?? "",
      email: record.email ?? "",
      telefone: record.telefone ?? "",
      logradouro: record.logradouro ?? "",
      numero: record.numero ?? "",
      complemento: record.complemento ?? "",
      bairro: record.bairro ?? "",
      municipio: record.municipio ?? "",
      uf: record.uf ?? "",
      cep: record.cep ?? "",
    });
  }

  return rows;
}

export function validateClientRow(row: ParsedClientRow): string | null {
  if (row.tipo_pessoa !== "PF" && row.tipo_pessoa !== "PJ") {
    return "Tipo deve ser PF ou PJ";
  }
  if (!isValidCpfCnpj(row.cpf_cnpj, row.tipo_pessoa)) {
    return row.tipo_pessoa === "PF" ? "CPF inválido" : "CNPJ inválido";
  }
  if (!row.nome_razao_social) {
    return "Nome / Razão Social é obrigatório";
  }
  return null;
}
