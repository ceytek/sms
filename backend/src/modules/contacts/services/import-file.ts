import * as XLSX from 'xlsx';

const MAX_ROWS = 10000;

export function detectImportKind(file: Express.Multer.File): 'EXCEL' | 'CSV' {
  const name = (file.originalname || '').toLowerCase();
  const mime = file.mimetype || '';
  if (name.endsWith('.csv') || mime.includes('csv')) return 'CSV';
  return 'EXCEL';
}

export function parseSpreadsheet(file: Express.Multer.File): {
  columns: string[];
  rows: Record<string, string>[];
} {
  const workbook = XLSX.read(file.buffer, { type: 'buffer', raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Dosyada sayfa bulunamadı');
  }
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  if (!matrix.length) {
    return { columns: [], rows: [] };
  }
  const headerRow = (matrix[0] ?? []).map((cell, index) => {
    const label = String(cell ?? '').trim();
    return label || `Kolon ${index + 1}`;
  });
  const rows: Record<string, string>[] = [];
  for (const raw of matrix.slice(1)) {
    if (rows.length >= MAX_ROWS) break;
    const record: Record<string, string> = {};
    let empty = true;
    headerRow.forEach((column, index) => {
      const value = String(raw[index] ?? '').trim();
      record[column] = value;
      if (value) empty = false;
    });
    if (!empty) rows.push(record);
  }
  return { columns: headerRow, rows };
}

export { MAX_ROWS };
