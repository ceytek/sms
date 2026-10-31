export const SURVEY_SERVICE_CODE = 'SURVEY';

export const SURVEY_QUESTION_TYPES = [
  'SINGLE',
  'MULTI',
  'SHORT_TEXT',
  'LONG_TEXT',
  'YES_NO',
  'RATING',
  'STARS',
  'NPS',
  'DROPDOWN',
  'DATE',
] as const;

export type SurveyQuestionType = (typeof SURVEY_QUESTION_TYPES)[number];

export const SURVEY_STATUSES = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED'] as const;

export const TEMPLATE_CATEGORIES = ['Etkinlik', 'Hizmet', 'Müşteri Deneyimi', 'İnsan Kaynakları', 'Ürün'] as const;

export const CHOICE_TYPES = new Set<SurveyQuestionType>(['SINGLE', 'MULTI', 'DROPDOWN', 'YES_NO']);

export function npsBreakdown(values: number[]) {
  let detractors = 0;
  let passives = 0;
  let promoters = 0;
  for (const value of values) {
    if (value <= 6) detractors += 1;
    else if (value <= 8) passives += 1;
    else promoters += 1;
  }
  const total = values.length;
  const score = total ? Math.round(((promoters - detractors) / total) * 100) : 0;
  return { total, detractors, passives, promoters, score };
}

export function slugifySurveyName(value: string) {
  const map: Record<string, string> = {
    ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
    Ç: 'c', Ğ: 'g', İ: 'i', I: 'i', Ö: 'o', Ş: 's', Ü: 'u',
  };
  const raw = [...value].map((char) => map[char] ?? char).join('');
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'anket';
}
