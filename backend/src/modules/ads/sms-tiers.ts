export interface SmsTierInput {
  creditAmount: number;
  unitPrice: number | string;
}

export interface SmsTierLine {
  label: string;
  priceLabel: string;
}

function formatAmount(value: number) {
  return value.toLocaleString('tr-TR');
}

function formatPrice(unitPrice: number | string) {
  return `${Number(unitPrice ?? 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })} ₺`;
}

export function buildSmsTierLines(tiers: SmsTierInput[]): SmsTierLine[] {
  const sorted = [...tiers]
    .filter((tier) => Number(tier.creditAmount) > 0)
    .sort((a, b) => a.creditAmount - b.creditAmount);

  return sorted.map((tier, index) => {
    const from = index === 0 ? 1 : sorted[index - 1].creditAmount + 1;
    const to = tier.creditAmount;
    return {
      label: `${formatAmount(from)} – ${formatAmount(to)} SMS`,
      priceLabel: formatPrice(tier.unitPrice),
    };
  });
}
