const PHONE_HEADERS = new Set([
  "telefon",
  "tel",
  "phone",
  "mobile",
  "gsm",
  "cep",
  "cep telefonu",
  "ceptelefonu",
  "numara",
  "cellphone",
  "mobilephone",
  "mobile_phone",
  "cepno",
  "cep_no",
]);

function normalizeHeader(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function looksLikePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13 && /5/.test(digits);
}

export function extractPhonesFromMatrix(matrix: (string | number | null | undefined)[][]): string[] {
  if (!matrix.length) return [];
  const header = (matrix[0] ?? []).map((cell) => normalizeHeader(String(cell ?? "")));
  const phoneCol = header.findIndex((cell) => PHONE_HEADERS.has(cell));
  const body = phoneCol >= 0 ? matrix.slice(1) : matrix;
  const phones: string[] = [];
  for (const row of body) {
    const cells = (row ?? []).map((cell) => String(cell ?? "").trim());
    const candidate = phoneCol >= 0 ? cells[phoneCol] ?? "" : (cells.find((cell) => looksLikePhone(cell)) ?? "");
    if (candidate) phones.push(candidate);
  }
  return phones;
}

export async function parseSmsSpreadsheet(file: File): Promise<string[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt")) {
    const text = await file.text();
    return [text];
  }
  type XlsxLib = Pick<typeof import("xlsx"), "read" | "utils">;
  const loaded = (await import("xlsx")) as unknown as XlsxLib & { default?: XlsxLib };
  const lib = loaded.default?.read ? loaded.default : loaded;
  const buf = await file.arrayBuffer();
  const workbook = lib.read(buf, { type: "array", raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const matrix = lib.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  return extractPhonesFromMatrix(matrix);
}
