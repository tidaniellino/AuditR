export interface ImportResult {
  error?: string;
  inserted?: number;
  skipped?: { rowNumber: number; reason: string }[];
}
