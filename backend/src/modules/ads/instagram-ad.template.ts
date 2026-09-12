export interface AdPackageLine {
  label: string;
  priceLabel: string;
}

export interface InstagramAdModel {
  title: string;
  subtitle: string;
  listName: string;
  packages: AdPackageLine[];
  cta: string;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderInstagramAdSvg(model: InstagramAdModel): string {
  const packages = model.packages.slice(0, 7);
  const startY = 290;
  const rowH = 78;
  const rows = packages
    .map((pkg, i) => {
      const y = startY + i * rowH;
      return `
      <g>
        <rect x="150" y="${y}" rx="36" ry="36" width="780" height="64" fill="#ffffff"/>
        <circle cx="196" cy="${y + 32}" r="18" fill="#2f6bff"/>
        <path d="M188 ${y + 26} h16 a4 4 0 0 1 4 4 v10 a4 4 0 0 1 -4 4 h-9 l-7 6 v-6 h0 a4 4 0 0 1 -4 -4 v-10 a4 4 0 0 1 4 -4 z" fill="#ffffff"/>
        <text x="238" y="${y + 40}" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#12305c">${escapeXml(pkg.label)}</text>
        <text x="890" y="${y + 40}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#2f6bff">${escapeXml(pkg.priceLabel)}</text>
      </g>`;
    })
    .join('');

  const features = [
    { y: 340, label: 'HIZLI', sub: 'GÖNDERİM' },
    { y: 470, label: 'GENİŞ KİTLELERE', sub: 'ULAŞIM' },
    { y: 600, label: 'GÜVENİLİR', sub: 'ALTYAPI' },
    { y: 730, label: 'DAHA GÜÇLÜ', sub: 'İLETİŞİM' },
  ]
    .map(
      (f) => `
      <g>
        <text x="48" y="${f.y}" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#7eb6ff">${escapeXml(f.label)}</text>
        <text x="48" y="${f.y + 18}" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#7eb6ff">${escapeXml(f.sub)}</text>
      </g>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#08245c"/>
      <stop offset="55%" stop-color="#041635"/>
      <stop offset="100%" stop-color="#020c22"/>
    </linearGradient>
    <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3d8bff" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#3d8bff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <circle cx="980" cy="120" r="180" fill="url(#glow)"/>
  <circle cx="70" cy="980" r="220" fill="#0b2c6a" opacity="0.45"/>

  <g opacity="0.25" fill="#7eb6ff">
    <rect x="820" y="860" width="28" height="120" rx="4"/>
    <rect x="860" y="820" width="36" height="160" rx="4"/>
    <rect x="910" y="790" width="24" height="190" rx="4"/>
    <rect x="950" y="830" width="42" height="150" rx="4"/>
    <path d="M980 250 l18 70 h-36 z" fill="#4ea2ff"/>
  </g>

  <text x="70" y="70" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#8ec4ff">MESAJINIZ DAİMA ULAŞSIN</text>
  <text x="70" y="160" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#9fd0ff">${escapeXml(model.listName)}</text>
  <text x="70" y="220" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="800" fill="#ffffff">TOPLU SMS</text>
  <text x="70" y="280" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="800" fill="#4db7ff">PAKETLERİ</text>
  <text x="540" y="248" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#cfe6ff">${escapeXml(model.subtitle)}</text>

  ${rows}
  ${features}

  <rect x="150" y="920" rx="18" ry="18" width="780" height="88" fill="none" stroke="#4db7ff" stroke-width="3"/>
  <text x="540" y="956" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#9fd0ff">Size özel fiyat avantajları için</text>
  <text x="540" y="986" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" fill="#4db7ff">${escapeXml(model.cta)}</text>
</svg>`;
}
