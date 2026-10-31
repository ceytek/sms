const TECHNICAL = /\b(must be|should not|each value|is not valid|longer than or equal|shorter than or equal|must contain|must match|Internal server error)\b/i;

export function humanizeValidationMessages(input: unknown): string {
  const raw = Array.isArray(input) ? input.flatMap(splitMessage) : splitMessage(input);
  const emptyQuestions: number[] = [];
  const emptyOptions: string[] = [];
  const rest: string[] = [];

  for (const text of raw) {
    const question = text.match(/^questions\.(\d+)\.text\b/i);
    if (question) {
      emptyQuestions.push(Number(question[1]) + 1);
      continue;
    }
    const option = text.match(/^questions\.(\d+)\.options\.(\d+)\.label\b/i);
    if (option) {
      emptyOptions.push(`${Number(option[1]) + 1}. sorunun ${Number(option[2]) + 1}. seçeneği`);
      continue;
    }
    if (TECHNICAL.test(text) || /^[a-zA-Z_][\w.]*(?:\.\d+)+/.test(text)) {
      const friendly = friendlyField(text);
      if (!rest.includes(friendly)) rest.push(friendly);
      continue;
    }
    if (!rest.includes(text)) rest.push(text);
  }

  const parts: string[] = [];
  if (emptyQuestions.length === 1) parts.push(`${emptyQuestions[0]}. sorunun metnini yazın.`);
  else if (emptyQuestions.length) parts.push(`${joinTr(emptyQuestions)}. soruların metnini yazın.`);
  if (emptyOptions.length === 1) parts.push(`${emptyOptions[0]} boş bırakılamaz.`);
  else if (emptyOptions.length) parts.push(`Boş seçenek var: ${emptyOptions.join(', ')}.`);
  for (const item of rest) parts.push(item.endsWith('.') ? item : `${item}.`);
  return parts.join(' ') || 'Girilen bilgiler eksik. Kontrol edip tekrar deneyin.';
}

function splitMessage(value: unknown) {
  return String(value ?? '')
    .split(/\s*,\s*(?=[A-Za-z_][\w.]*(?:\.\d+)+\.)/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function friendlyField(text: string) {
  if (/^name\b/i.test(text)) return 'Anket adını yazın';
  if (/formTitle/i.test(text)) return 'Form başlığını yazın';
  if (/originator/i.test(text)) return 'SMS başlığı seçin';
  if (/\bbody\b|smsBody/i.test(text)) return 'SMS metnini yazın';
  if (/thankYou/i.test(text)) return 'Teşekkür mesajını yazın';
  if (/description/i.test(text)) return 'Açıklama çok uzun';
  return 'Bazı alanlar eksik veya hatalı. Kontrol edip tekrar deneyin';
}

function joinTr(values: number[]) {
  const labels = values.map(String);
  if (labels.length === 2) return `${labels[0]} ve ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} ve ${labels[labels.length - 1]}`;
}
