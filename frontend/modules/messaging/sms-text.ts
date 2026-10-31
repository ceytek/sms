const GSM7 =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM7_EXT = "^{}\\[~]|€";
const TURKISH = /[çğıöşüÇĞİÖŞÜ]/u;
const TURKISH_ASCII: Record<string, string> = {
  ç: "c",
  Ç: "C",
  ğ: "g",
  Ğ: "G",
  ı: "i",
  İ: "I",
  ö: "o",
  Ö: "O",
  ş: "s",
  Ş: "S",
  ü: "u",
  Ü: "U",
};

function isGsm7Char(char: string) {
  return GSM7.includes(char) || GSM7_EXT.includes(char) || char === "\r" || char === "\n";
}

function usesUnicode(text: string) {
  return [...text].some((char) => TURKISH.test(char) || !isGsm7Char(char));
}

function smsParts(length: number, single: number, concatenated: number) {
  if (length <= single) return 1;
  return Math.ceil(length / concatenated);
}

export function smsEncodingAndParts(body: string): { encoding: "GSM7" | "UCS2"; parts: number } {
  const text = body ?? "";
  if (!text) return { encoding: "GSM7", parts: 1 };
  if (usesUnicode(text)) return { encoding: "UCS2", parts: smsParts([...text].length, 70, 67) };
  return { encoding: "GSM7", parts: smsParts([...text].length, 160, 153) };
}

export function analyzeSms(body: string) {
  const text = body ?? "";
  const info = smsEncodingAndParts(text);
  const optimized = text.replace(TURKISH, (char) => TURKISH_ASCII[char] ?? char);
  const optimizedInfo = optimized === text ? null : smsEncodingAndParts(optimized);
  const saving = optimizedInfo && optimizedInfo.encoding === "GSM7" && optimizedInfo.parts < info.parts ? info.parts - optimizedInfo.parts : 0;
  return {
    length: [...text].length,
    encoding: info.encoding,
    parts: info.parts,
    optimized: saving > 0 ? optimized : "",
    optimizedParts: saving > 0 ? optimizedInfo?.parts ?? info.parts : info.parts,
    saving,
  };
}

export function previewSmsTemplate(template: string) {
  return renderSmsTemplate(template, {
    firstName: "Ahmet",
    lastName: "Yılmaz",
    companyName: "ABC Limited",
    phone: "0532 000 00 00",
    email: "ahmet@example.com",
  });
}

export function renderSmsTemplate(
  template: string,
  vars: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    phone?: string;
    email?: string;
  },
) {
  const fullName = [vars.firstName, vars.lastName].filter(Boolean).join(" ").trim();
  return template
    .replace(/\{ad\}/gi, vars.firstName ?? "")
    .replace(/\{soyad\}/gi, vars.lastName ?? "")
    .replace(/\{yetkili\}/gi, fullName)
    .replace(/\{firma_adi\}/gi, vars.companyName ?? "")
    .replace(/\{firma\}/gi, vars.companyName ?? "")
    .replace(/\{first_name\}/gi, vars.firstName ?? "")
    .replace(/\{last_name\}/gi, vars.lastName ?? "")
    .replace(/\{telefon\}/gi, vars.phone ?? "")
    .replace(/\{email\}/gi, vars.email ?? "");
}
export function smsProgress(body: string) {
  const text = body ?? "";
  const length = [...text].length;
  const { encoding, parts } = smsEncodingAndParts(text);
  if (encoding === "GSM7") {
    if (length <= 160) return { encoding, parts, used: length, perPart: 160 };
    const rem = length % 153;
    return { encoding, parts, used: rem === 0 ? 153 : rem, perPart: 153 };
  }
  if (length <= 70) return { encoding, parts, used: length, perPart: 70 };
  const rem = length % 67;
  return { encoding, parts, used: rem === 0 ? 67 : rem, perPart: 67 };
}
