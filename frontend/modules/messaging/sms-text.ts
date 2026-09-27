const GSM7 =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';

export function smsEncodingAndParts(body: string): { encoding: "GSM7" | "UCS2"; parts: number } {
  const text = body ?? "";
  if (!text) return { encoding: "GSM7", parts: 1 };
  const gsm = [...text].every((char) => GSM7.includes(char) || char === "\r" || char === "\n");
  if (gsm) {
    const parts = text.length <= 160 ? 1 : Math.ceil(text.length / 153);
    return { encoding: "GSM7", parts };
  }
  const parts = text.length <= 70 ? 1 : Math.ceil(text.length / 67);
  return { encoding: "UCS2", parts };
}

export function previewSmsTemplate(template: string) {
  return renderSmsTemplate(template, {
    firstName: "Ahmet",
    lastName: "Yılmaz",
    companyName: "ABC Limited",
    phone: "0532 000 00 00",
    email: "ahmet@example.com",
  });
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
  const fullName = [vars.firstName, vars.lastName].filter(Boolean).join(" ").trim();
  return template
    .replace(/\{ad\}/gi, vars.firstName ?? "")
    .replace(/\{soyad\}/gi, vars.lastName ?? "")
    .replace(/\{yetkili\}/gi, fullName)
    .replace(/\{firma_adi\}/gi, vars.companyName ?? "")
    .replace(/\{firma\}/gi, vars.companyName ?? "")
    .replace(/\{first_name\}/gi, vars.firstName ?? "")
    .replace(/\{last_name\}/gi, vars.lastName ?? "")
    .replace(/\{telefon\}/gi, vars.phone ?? "")
    .replace(/\{email\}/gi, vars.email ?? "");
}
export function smsProgress(body: string) {
  const text = body ?? "";
  const { encoding, parts } = smsEncodingAndParts(text);
  if (encoding === "GSM7") {
    if (text.length <= 160) {
      return { encoding, parts, used: text.length, perPart: 160 };
    }
    const rem = text.length % 153;
    return { encoding, parts, used: rem === 0 ? 153 : rem, perPart: 153 };
  }
  if (text.length <= 70) {
    return { encoding, parts, used: text.length, perPart: 70 };
  }
  const rem = text.length % 67;
  return { encoding, parts, used: rem === 0 ? 67 : rem, perPart: 67 };
}
