export function normalizeOriginatorName(name: string) {
  return String(name || '').trim().replace(/\s+/g, '');
}

export function originatorNameKey(name: string) {
  return normalizeOriginatorName(name).toUpperCase();
}
