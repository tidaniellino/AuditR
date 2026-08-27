import ExcelJS from "exceljs";

export interface ContractReportRow {
  title: string;
  clientName: string;
  templateName: string;
  statusLabel: string;
  valor: number | null;
  creatorName: string;
  createdAt: string;
  signedAt: string | null;
}

const COLUMNS = [
  { header: "Título", key: "title", width: 32 },
  { header: "Cliente", key: "clientName", width: 28 },
  { header: "Modelo", key: "templateName", width: 24 },
  { header: "Status", key: "statusLabel", width: 20 },
  { header: "Valor", key: "valor", width: 16 },
  { header: "Gerado por", key: "creatorName", width: 22 },
  { header: "Criado em", key: "createdAt", width: 18 },
  { header: "Assinado em", key: "signedAt", width: 18 },
] as const;

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("pt-BR") : "";
}

function formatValor(valor: number | null): string {
  return valor != null ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
}

function toPlainRow(row: ContractReportRow): Record<(typeof COLUMNS)[number]["key"], string> {
  return {
    title: row.title,
    clientName: row.clientName,
    templateName: row.templateName,
    statusLabel: row.statusLabel,
    valor: formatValor(row.valor),
    creatorName: row.creatorName,
    createdAt: formatDate(row.createdAt),
    signedAt: formatDate(row.signedAt),
  };
}

export async function buildContractsReportXlsx(rows: ContractReportRow[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Contratos");
  sheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) sheet.addRow(toPlainRow(row));
  return workbook.xlsx.writeBuffer();
}

function csvEscape(value: string): string {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildContractsReportCsv(rows: ContractReportRow[]): string {
  const header = COLUMNS.map((c) => csvEscape(c.header)).join(",");
  const lines = rows.map((row) => {
    const plain = toPlainRow(row);
    return COLUMNS.map((c) => csvEscape(plain[c.key])).join(",");
  });
  return [header, ...lines].join("\r\n");
}
