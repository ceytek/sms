export function normalizeTrMobile(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('90') && digits.length === 12 && digits[2] === '5') {
    return digits;
  }
  if (digits.startsWith('0') && digits.length === 11 && digits[1] === '5') {
    return `90${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits[0] === '5') {
    return `90${digits}`;
  }
  return null;
}

const GSM7 =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';

export function smsEncodingAndParts(body: string): { encoding: 'GSM7' | 'UCS2'; parts: number } {
  const text = body ?? '';
  if (!text) return { encoding: 'GSM7', parts: 1 };
  const gsm = [...text].every((char) => GSM7.includes(char) || char === '\r' || char === '\n');
  if (gsm) {
    const parts = text.length <= 160 ? 1 : Math.ceil(text.length / 153);
    return { encoding: 'GSM7', parts };
  }
  const parts = text.length <= 70 ? 1 : Math.ceil(text.length / 67);
  return { encoding: 'UCS2', parts };
}
