export function normalizeTrMobile(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("90") && digits.length === 12 && digits[2] === "5") return digits;
  if (digits.startsWith("0") && digits.length === 11 && digits[1] === "5") return `90${digits.slice(1)}`;
  if (digits.length === 10 && digits[0] === "5") return `90${digits}`;
  return null;
}

/** Yazılmış veya yapışmış metinden Türkiye GSM numaralarını ayıklar. Uymayan parçalar sepete girmez. */
export function parseGsmNumbers(text: string): { valid: string[]; rejected: string[] } {
  const valid: string[] = [];
  const rejected: string[] = [];
  const seen = new Set<string>();
  for (const chunk of text.split(/[,;\n\r]+/)) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const digits = trimmed.replace(/\D/g, "");
    if (!digits) continue;
    const { taken, rest } = takeMobiles(digits);
    for (const phone of taken) {
      if (seen.has(phone)) continue;
      seen.add(phone);
      valid.push(phone);
    }
    if (rest) rejected.push(rest);
  }
  return { valid, rejected };
}

function takeMobiles(digits: string): { taken: string[]; rest: string } {
  const taken: string[] = [];
  let index = 0;
  while (index < digits.length) {
    const rest = digits.slice(index);
    if (rest.startsWith("90") && rest.length >= 12 && rest[2] === "5") {
      taken.push(rest.slice(0, 12));
      index += 12;
      continue;
    }
    if (rest.startsWith("0") && rest.length >= 11 && rest[1] === "5") {
      taken.push(`90${rest.slice(1, 11)}`);
      index += 11;
      continue;
    }
    if (rest[0] === "5" && rest.length >= 10) {
      taken.push(`90${rest.slice(0, 10)}`);
      index += 10;
      continue;
    }
    return { taken, rest };
  }
  return { taken, rest: "" };
}

export function formatTrMobile(normalized?: string | null): string {
  if (!normalized) return "";
  if (normalized.length === 12 && normalized.startsWith("90")) {
    const local = normalized.slice(2);
    return `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
  }
  return normalized;
}
