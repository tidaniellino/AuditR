import ExcelJS from "exceljs";

export const TEMPLATE_COLUMNS = [
  { header: "Nome", key: "name" },
  { header: "Descrição", key: "description" },
  { header: "Tipo de contrato", key: "contract_type" },
] as const;

const EXAMPLE_ROW = ["Contrato de Prestação de Serviços", "Modelo padrão para clientes PJ", "Serviços"];

export async function buildTemplatesTemplate(): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Modelos");

  sheet.columns = TEMPLATE_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: 32 }));
  sheet.addRow(EXAMPLE_ROW);
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(2).font = { italic: true, color: { argb: "FF6B6A63" } };

  return workbook.xlsx.writeBuffer();
}

export interface ParsedTemplateRow {
  rowNumber: number;
  name: string;
  description: string;
  contract_type: string;
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const HEADER_LOOKUP = new Map(TEMPLATE_COLUMNS.map((c) => [normalizeHeader(c.header), c.key]));

export const MAX_IMPORT_ROWS = 300;
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function parseTemplatesWorkbook(buffer: ArrayBuffer): Promise<ParsedTemplateRow[]> {
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

  const rows: ParsedTemplateRow[] = [];
  const lastRow = Math.min(sheet.rowCount, MAX_IMPORT_ROWS + 1);

  for (let r = 2; r <= lastRow; r++) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;

    const record: Record<string, string> = {};
    for (const [colNumber, key] of colIndexToKey) {
      record[key] = String(row.getCell(colNumber).value ?? "").trim();
    }
    if (!record.name) continue; // linha em branco

    rows.push({
      rowNumber: r,
      name: record.name ?? "",
      description: record.description ?? "",
      contract_type: record.contract_type ?? "",
    });
  }

  return rows;
}

export function validateTemplateRow(row: ParsedTemplateRow): string | null {
  if (!row.name) return "Nome é obrigatório";
  return null;
}
