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

export function formatTrMobile(normalized?: string | null): string {
  if (!normalized) return '';
  if (normalized.length === 12 && normalized.startsWith('90')) {
    const local = normalized.slice(2);
    return `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
  }
  return normalized;
}
