export function normalizeOriginatorName(name: string) {
  return name.trim().toUpperCase().replace(/\s+/g, '');
}
