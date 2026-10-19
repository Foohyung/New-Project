import type { ArtPalette, ArtType } from '@/features/homes/types';

// ภาพประกอบทรัพย์แบบ SVG (ใช้แทนรูปจริงในระยะที่ 1 — ระยะที่ 2 ใช้รูปที่ agent อัปโหลดผ่าน next/image)
const PALETTES: Record<ArtPalette, Record<'sky1' | 'sky2' | 'sun' | 'b1' | 'b2' | 'win' | 'lit' | 'ground' | 'accent' | 'trunk' | 'leaf' | 'roof', string>> = {
  warm: { sky1: '#F8C9A0', sky2: '#FBE7D3', sun: '#F07F4F', b1: '#FFF7EE', b2: '#E8D5C0', win: '#D9B48F', lit: '#FFD27A', ground: '#A9B37A', accent: '#C65D3B', trunk: '#6B4A33', leaf: '#5E6B3A', roof: '#C65D3B' },
  wood: { sky1: '#BFD3C1', sky2: '#EEF1E4', sun: '#F4D58D', b1: '#B07A4F', b2: '#8A5A36', win: '#6B4A33', lit: '#FFD27A', ground: '#7F8F55', accent: '#4A3424', trunk: '#5A3E2B', leaf: '#4F6B3A', roof: '#5A3E2B' },
  dusk: { sky1: '#E9A27A', sky2: '#F8DCC4', sun: '#FFF1D6', b1: '#F2E6D8', b2: '#D8C2AA', win: '#BFA286', lit: '#FFD27A', ground: '#B4A27E', accent: '#C65D3B', trunk: '#6B4A33', leaf: '#6E7D45', roof: '#A8472A' },
};

export function PropertyArt({ id, type, palette, label }: { id: string; type: ArtType; palette: ArtPalette; label: string }) {
  const p = PALETTES[palette];
  const sky = `sky-${id}`;
  return (
    <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} className="block size-full">
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky1} />
          <stop offset="1" stopColor={p.sky2} />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill={`url(#${sky})`} />
      <circle cx="318" cy="64" r="26" fill={p.sun} />
      <rect y="228" width="400" height="32" fill={p.ground} />
      {type === 'house' && (
        <g>
          <rect x="58" y="170" width="8" height="60" fill={p.trunk} />
          <circle cx="62" cy="158" r="30" fill={p.leaf} />
          <circle cx="352" cy="186" r="22" fill={p.leaf} />
          <rect x="120" y="122" width="170" height="108" fill={p.b1} />
          <polygon points="106,126 205,60 304,126" fill={p.roof} />
          <rect x="190" y="168" width="32" height="62" rx="16" fill={p.accent} />
          <rect x="138" y="142" width="36" height="30" rx="18" fill={p.lit} />
          <rect x="238" y="142" width="36" height="30" rx="18" fill={p.win} />
          <circle cx="205" cy="98" r="12" fill={p.lit} />
        </g>
      )}
      {type === 'townhouse' &&
        [70, 160, 250].map((x, i) => (
          <g key={x}>
            <rect x={x} y="92" width="86" height="138" fill={i % 2 ? p.b2 : p.b1} />
            <polygon points={`${x - 4},96 ${x + 43},62 ${x + 90},96`} fill={p.roof} />
            <rect x={x + 14} y="108" width="24" height="24" rx="12" fill={i === 1 ? p.lit : p.win} />
            <rect x={x + 48} y="108" width="24" height="24" rx="12" fill={p.win} />
            <rect x={x + 48} y="188" width="24" height="42" rx="12" fill={p.accent} />
          </g>
        ))}
      {type === 'condo' && (
        <g>
          <rect x="64" y="118" width="64" height="112" rx="6" fill={p.b2} />
          <rect x="150" y="40" width="100" height="190" rx="8" fill={p.b1} />
          {Array.from({ length: 36 }, (_, i) => (
            <rect key={i} x={162 + (i % 4) * 21} y={54 + Math.floor(i / 4) * 18} width="13" height="10" rx="3" fill={i % 5 === 0 ? p.lit : p.win} />
          ))}
          <rect x="264" y="100" width="72" height="130" rx="6" fill={p.b2} />
          <circle cx="96" cy="206" r="20" fill={p.leaf} />
        </g>
      )}
      {type === 'villa' && (
        <g>
          <rect x="70" y="132" width="260" height="90" fill={p.b1} />
          <rect x="52" y="120" width="296" height="14" rx="7" fill={p.roof} />
          <rect x="92" y="148" width="96" height="62" rx="8" fill={p.lit} />
          <rect x="204" y="148" width="104" height="62" rx="8" fill={p.win} />
        </g>
      )}
      {type === 'land' && (
        <g>
          <path d="M0 186 Q100 146 200 176 T400 166 V260 H0z" fill={p.leaf} opacity=".55" />
          <path d="M0 214 Q120 184 240 208 T400 202 V260 H0z" fill={p.leaf} />
          <rect x="252" y="150" width="6" height="58" fill={p.trunk} />
          <rect x="226" y="132" width="58" height="30" rx="8" fill={p.accent} />
          <text x="255" y="153" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">ขาย</text>
          {[60, 112, 340].map(x => (
            <g key={x}>
              <rect x={x - 2} y="176" width="4" height="22" fill={p.trunk} />
              <circle cx={x} cy="170" r="13" fill={p.trunk} />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
