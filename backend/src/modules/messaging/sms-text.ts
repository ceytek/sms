export { normalizeTrMobile } from '../../common/phone/normalize-tr-mobile.js';

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

export function renderSmsTemplate(
  template: string,
  vars: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    phone?: string;
    email?: string;
  },
) {
  const fullName = [vars.firstName, vars.lastName].filter(Boolean).join(' ').trim();
  return template
    .replace(/\{ad\}/gi, vars.firstName ?? '')
    .replace(/\{soyad\}/gi, vars.lastName ?? '')
    .replace(/\{yetkili\}/gi, fullName)
    .replace(/\{firma_adi\}/gi, vars.companyName ?? '')
    .replace(/\{firma\}/gi, vars.companyName ?? '')
    .replace(/\{first_name\}/gi, vars.firstName ?? '')
    .replace(/\{last_name\}/gi, vars.lastName ?? '')
    .replace(/\{telefon\}/gi, vars.phone ?? '')
    .replace(/\{email\}/gi, vars.email ?? '');
}

export function hasPersonalization(template: string) {
  return /\{(ad|soyad|firma|firma_adi|yetkili|telefon|email|first_name|last_name)\}/i.test(template);
}
