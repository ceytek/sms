export function parseCreditRefundRate(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > 100) return null;
  return amount;
}

export function formatCreditRefundRate(value?: number | string | null): string {
  if (value == null || value === "") return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return String(amount);
}

export function displayCreditRefundRate(value?: number | string | null): string | null {
  if (value == null || value === "") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return `%${amount.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`;
}
