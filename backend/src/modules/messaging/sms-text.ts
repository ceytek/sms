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
