export const FORM_SERVICE_CODE = 'FORM';

export const FORM_FIELD_TYPES = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'FIRST_NAME',
  'LAST_NAME',
  'PHONE',
  'EMAIL',
  'NUMBER',
  'DATE',
  'TIME',
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'DROPDOWN',
  'YES_NO',
  'ADDRESS',
  'CITY',
  'DISTRICT',
  'CHECKBOX',
  'FILE_UPLOAD',
  'HEADING',
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export const FORM_STATUSES = ['DRAFT', 'ACTIVE', 'PASSIVE', 'EXPIRED', 'ARCHIVED'] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

export const SUBMISSION_STATUSES = ['NEW', 'IN_REVIEW', 'COMPLETED', 'APPROVED', 'REJECTED', 'ARCHIVED'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const TEMPLATE_CATEGORIES = ['Genel', 'Başvuru', 'Etkinlik', 'Üyelik'] as const;

export const CHOICE_FIELD_TYPES = new Set<FormFieldType>(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN', 'YES_NO']);

export function slugifyFormName(value: string) {
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
  return slug || 'form';
}
