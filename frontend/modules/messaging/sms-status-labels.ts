export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Taslak",
  SCHEDULED: "Zamanlandı",
  PREPARING: "Hazırlanıyor",
  READY: "Hazır",
  QUEUED: "Beklemede",
  SENDING: "Gönderiliyor",
  PROCESSING: "Gönderiliyor",
  SENT: "İletildi",
  COMPLETED: "İletildi",
  PARTIALLY_COMPLETED: "Kısmen iletildi",
  MOCK_SENT: "İletildi",
  FAILED: "İletilemedi",
  CANCELLED: "İptal",
};

export const RECIPIENT_STATUS_LABELS: Record<string, string> = {
  INCLUDED: "Beklemede",
  QUEUED: "Beklemede",
  PROCESSING: "Gönderiliyor",
  ACCEPTED: "İletildi",
  SENT: "İletildi",
  DELIVERED: "Teslim edildi",
  FAILED: "İletilemedi",
  REJECTED: "İletilemedi",
  EXPIRED: "İletilemedi",
  EXCLUDED: "Gönderilmedi",
  INVALID: "Geçersiz",
  DUPLICATE: "Mükerrer",
};

export function campaignStatusLabel(status?: string | null) {
  if (!status) return "";
  return CAMPAIGN_STATUS_LABELS[status] || status;
}

export function recipientStatusLabel(status?: string | null) {
  if (!status) return "";
  return RECIPIENT_STATUS_LABELS[status] || status;
}
