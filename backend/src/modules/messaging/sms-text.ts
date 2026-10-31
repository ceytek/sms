export { normalizeTrMobile } from '../../common/phone/normalize-tr-mobile.js';

const GSM7 =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM7_EXT = '^{}\\[~]|€';
const TURKISH = /[çğıöşüÇĞİÖŞÜ]/u;

function isGsm7Char(char: string) {
  return GSM7.includes(char) || GSM7_EXT.includes(char) || char === '\r' || char === '\n';
}

function smsParts(length: number, single: number, concatenated: number) {
  if (length <= single) return 1;
  return Math.ceil(length / concatenated);
}

export function smsEncodingAndParts(body: string): { encoding: 'GSM7' | 'UCS2'; parts: number } {
  const text = body ?? '';
  if (!text) return { encoding: 'GSM7', parts: 1 };
  const chars = [...text];
  const unicode = chars.some((char) => TURKISH.test(char) || !isGsm7Char(char));
  if (unicode) return { encoding: 'UCS2', parts: smsParts(chars.length, 70, 67) };
  return { encoding: 'GSM7', parts: smsParts(chars.length, 160, 153) };
}

export function customTokenKey(name: string) {
  return name.trim().toLocaleLowerCase('tr-TR');
}

export function renderSmsTemplate(
  template: string,
  vars: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    phone?: string;
    email?: string;
    custom?: Record<string, string>;
  },
) {
  const fullName = [vars.firstName, vars.lastName].filter(Boolean).join(' ').trim();
  const withSystem = template
    .replace(/\{ad\}/gi, vars.firstName ?? '')
    .replace(/\{soyad\}/gi, vars.lastName ?? '')
    .replace(/\{yetkili\}/gi, fullName)
    .replace(/\{firma_adi\}/gi, vars.companyName ?? '')
    .replace(/\{firma\}/gi, vars.companyName ?? '')
    .replace(/\{first_name\}/gi, vars.firstName ?? '')
    .replace(/\{last_name\}/gi, vars.lastName ?? '')
    .replace(/\{telefon\}/gi, vars.phone ?? '')
    .replace(/\{email\}/gi, vars.email ?? '');
  const custom = vars.custom ?? {};
  if (!Object.keys(custom).length) return withSystem;
  return withSystem.replace(/\{([^{}]+)\}/g, (full, inner: string) => {
    const key = customTokenKey(inner);
    return Object.prototype.hasOwnProperty.call(custom, key) ? custom[key] : full;
  });
}

const SYSTEM_TOKEN = /\{(ad|soyad|firma|firma_adi|yetkili|telefon|email|first_name|last_name)\}/i;

export function hasPersonalization(template: string, customNames: string[] = []) {
  if (SYSTEM_TOKEN.test(template)) return true;
  const lower = template.toLocaleLowerCase('tr-TR');
  return customNames.some((name) => lower.includes(`{${customTokenKey(name)}}`));
}
