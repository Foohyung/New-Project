import type { ReactNode } from 'react';
import type { ArtPalette, PropertyType } from '@/features/homes/types';

// ภาพประกอบทรัพย์แบบ SVG (ใช้แทนรูปจริงในระยะที่ 1 — ระยะที่ 2 ใช้รูปที่ agent อัปโหลดผ่าน next/image)
type Pal = Record<'s1' | 's2' | 'sun' | 'b1' | 'b2' | 'b3' | 'win' | 'lit' | 'g' | 'roof' | 'acc' | 'leaf' | 'trunk', string> & { sea?: string };
const PALETTES: Record<ArtPalette, Pal> = {
  day: { s1: '#9CC5FF', s2: '#E8F1FF', sun: '#FFD66B', b1: '#FFFFFF', b2: '#D6E2F5', b3: '#AFC3E3', win: '#7FA3D6', lit: '#FFD66B', g: '#9BC58A', roof: '#2E5AAC', acc: '#1A56DB', leaf: '#4E9A5B', trunk: '#6B4A33' },
  dusk: { s1: '#F6B38C', s2: '#FDE6D2', sun: '#FFF3DA', b1: '#FFF8F0', b2: '#EBD7C4', b3: '#D3B79F', win: '#C29C7C', lit: '#FFD27A', g: '#B9B07E', roof: '#B5532F', acc: '#E0662C', leaf: '#6E7D45', trunk: '#6B4A33' },
  night: { s1: '#1F2D5C', s2: '#3E5AA8', sun: '#F4F1D8', b1: '#2E3F78', b2: '#24346A', b3: '#1A2756', win: '#41579A', lit: '#FFCF5A', g: '#1E2A52', roof: '#14204A', acc: '#FFB020', leaf: '#2E5A4E', trunk: '#3B2E2A' },
  mint: { s1: '#A8E2D2', s2: '#EAF8F2', sun: '#FFE38A', b1: '#FFFFFF', b2: '#DCEFE7', b3: '#B4D8CA', win: '#79B4A1', lit: '#FFD66B', g: '#86BE79', roof: '#2F7D6B', acc: '#13866F', leaf: '#3F8A4E', trunk: '#6B4A33' },
  sea: { s1: '#7FD0F0', s2: '#E6F7FD', sun: '#FFE08A', b1: '#FFFFFF', b2: '#D3ECF6', b3: '#A8D4E8', win: '#5FA9CF', lit: '#FFD66B', g: '#F1D9A6', roof: '#1C6E9C', acc: '#0E7FB8', leaf: '#3D9A6A', trunk: '#7A5A3A', sea: '#3BA7D6' },
};

function Tree({ x, y, r, p }: { x: number; y: number; r: number; p: Pal }) {
  return <><rect x={x - 3} y={y} width="6" height={226 - y} fill={p.trunk} /><circle cx={x} cy={y} r={r} fill={p.leaf} /></>;
}

function Building({ type, p, variant }: { type: PropertyType; p: Pal; variant: number }): ReactNode {
  if (type === 'condo' || type === 'office') {
    return (
      <g>
        <rect x="78" y="112" width="58" height="114" rx="4" fill={p.b2} />
        <rect x="150" y="34" width="104" height="192" rx="6" fill={p.b1} />
        <rect x="268" y="92" width="66" height="134" rx="4" fill={p.b2} />
        {Array.from({ length: 40 }, (_, i) => <rect key={i} x={162 + (i % 4) * 22} y={48 + Math.floor(i / 4) * 17} width="14" height="9" rx="2" fill={(i * 7 + variant) % 6 === 0 ? p.lit : p.win} />)}
        {Array.from({ length: 12 }, (_, j) => <rect key={`s${String(j)}`} x={88 + (j % 2) * 22} y={124 + Math.floor(j / 2) * 16} width="14" height="8" rx="2" fill={p.win} />)}
        <rect x="186" y="200" width="32" height="26" rx="3" fill={p.acc} />
        <Tree x={58} y={196} r={18} p={p} /><Tree x={352} y={200} r={15} p={p} />
      </g>
    );
  }
  if (type === 'townhouse' || type === 'twin') {
    const n = type === 'twin' ? 2 : 3, w = type === 'twin' ? 120 : 88, x0 = type === 'twin' ? 80 : 68;
    return (
      <g>
        {Array.from({ length: n }, (_, k) => {
          const x = x0 + k * (w + 2);
          return (
            <g key={k}>
              <rect x={x} y="96" width={w} height="130" fill={k % 2 ? p.b2 : p.b1} />
              <polygon points={`${String(x - 4)},100 ${String(x + w / 2)},64 ${String(x + w + 4)},100`} fill={p.roof} />
              <rect x={x + 12} y="112" width={w / 2 - 18} height="26" rx="4" fill={k === 1 ? p.lit : p.win} />
              <rect x={x + w / 2 + 6} y="112" width={w / 2 - 18} height="26" rx="4" fill={p.win} />
              <rect x={x + 12} y="156" width={w / 2 - 18} height="22" rx="4" fill={p.win} />
              <rect x={x + w / 2 + 6} y="182" width="24" height="44" rx="3" fill={p.acc} />
            </g>
          );
        })}
        <Tree x={46} y={190} r={20} p={p} />
      </g>
    );
  }
  if (type === 'land') {
    return (
      <g>
        <path d="M0 170 Q100 110 190 150 T400 130 V226 H0z" fill={p.b3} opacity=".8" />
        <path d="M0 200 Q120 170 230 190 T400 180 V226 H0z" fill={p.leaf} opacity=".6" />
        <g stroke={p.acc} strokeWidth="3"><line x1="90" y1="206" x2="90" y2="236" /><line x1="310" y1="206" x2="310" y2="236" /></g>
        <path d="M90 212 H310" stroke={p.acc} strokeWidth="2" strokeDasharray="6 6" />
        <Tree x={40} y={182} r={18} p={p} /><Tree x={366} y={186} r={16} p={p} />
      </g>
    );
  }
  if (type === 'shophouse' || type === 'apartment' || type === 'shop' || type === 'warehouse') {
    const apt = type === 'apartment', cols = apt ? 1 : 3, ww = apt ? 190 : 80, xs = apt ? 105 : 78, fl = apt ? 6 : 4;
    return (
      <g>
        {Array.from({ length: cols }, (_, c) => {
          const xx = xs + c * (ww + 2), top = 226 - fl * 30;
          return (
            <g key={c}>
              <rect x={xx} y={top} width={ww} height={fl * 30} fill={c % 2 ? p.b2 : p.b1} />
              {Array.from({ length: fl - 1 }, (_, f) => Array.from({ length: apt ? 6 : 2 }, (_, q) => (
                <rect key={`${String(f)}-${String(q)}`} x={xx + 10 + q * (apt ? 30 : 34)} y={top + 8 + f * 30} width={apt ? 20 : 26} height="16" rx="2" fill={(f + q + c + variant) % 5 === 0 ? p.lit : p.win} />
              )))}
              <rect x={xx + 6} y="200" width={ww - 12} height="26" fill={p.acc} opacity=".85" />
              <rect x={xx} y={top - 6} width={ww} height="8" fill={p.roof} />
            </g>
          );
        })}
        <Tree x={46} y={196} r={16} p={p} />
      </g>
    );
  }
  return (
    <g>
      <Tree x={56} y={162} r={28} p={p} /><Tree x={356} y={184} r={20} p={p} />
      <rect x="112" y="122" width="186" height="104" fill={p.b1} />
      <rect x="230" y="96" width="92" height="130" fill={p.b2} />
      <polygon points="98,126 205,62 312,126" fill={p.roof} />
      <rect x="222" y="88" width="108" height="10" fill={p.roof} />
      <rect x="188" y="166" width="34" height="60" rx="3" fill={p.acc} />
      <rect x="130" y="144" width="40" height="30" rx="4" fill={p.lit} />
      <rect x="246" y="114" width="56" height="34" rx="4" fill={p.win} />
      <rect x="246" y="164" width="56" height="34" rx="4" fill={p.lit} />
    </g>
  );
}

/** ภาพประกอบทรัพย์ — `variant` สลับมุม/ตำแหน่งดวงอาทิตย์ เพื่อทำภาพแกลเลอรีหลายภาพจากประกาศเดียว */
export function PropertyArt({ id, type, palette, label, variant = 0 }: { id: string; type: PropertyType; palette: ArtPalette; label: string; variant?: number }) {
  const p = PALETTES[palette];
  const sky = `sky-${id}`;
  const flip = variant % 2 === 1;
  return (
    <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true} className="block size-full">
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.s1} /><stop offset="1" stopColor={p.s2} /></linearGradient>
      </defs>
      <rect width="400" height="260" fill={`url(#${sky})`} />
      <circle cx={[318, 90, 250, 340][variant % 4]} cy="58" r="24" fill={p.sun} />
      <g fill={p.b3} opacity=".55"><rect x="0" y="150" width="40" height="80" /><rect x="44" y="128" width="30" height="102" /><rect x="330" y="140" width="34" height="90" /><rect x="368" y="120" width="32" height="110" /></g>
      {p.sea && <rect y="200" width="400" height="30" fill={p.sea} />}
      <rect y="226" width="400" height="34" fill={p.g} />
      <g transform={flip ? 'translate(400 0) scale(-1 1)' : undefined}><Building type={type} p={p} variant={variant} /></g>
    </svg>
  );
}

/** ไอคอนประเภททรัพย์แบบภาพประกอบเล็กในวงกลม */
export function TypeArt({ type }: { type: PropertyType }) {
  const win = (x: number, y: number, c = '#FFFFFF') => <rect key={`${String(x)}-${String(y)}`} x={x} y={y} width="4" height="4" rx="1" fill={c} />;
  const body: Record<PropertyType, ReactNode> = {
    condo: <><rect x="18" y="10" width="20" height="34" rx="2" fill="#4C8DF0" />{Array.from({ length: 12 }, (_, i) => win(21 + (i % 3) * 5.5, 14 + Math.floor(i / 3) * 6.5, i === 4 ? '#FFD66B' : undefined))}</>,
    office: <><rect x="18" y="10" width="20" height="34" rx="2" fill="#3FA9A0" />{Array.from({ length: 12 }, (_, i) => win(21 + (i % 3) * 5.5, 14 + Math.floor(i / 3) * 6.5))}</>,
    house: <><rect x="13" y="26" width="30" height="18" fill="#FFFFFF" /><polygon points="10,28 28,13 46,28" fill="#E0662C" /><rect x="25" y="33" width="7" height="11" fill="#4C8DF0" />{win(16, 31, '#FFD66B')}<circle cx="45" cy="38" r="5" fill="#4E9A5B" /></>,
    townhouse: <>{[0, 1, 2].map(k => <g key={k}><rect x={9 + k * 13} y="22" width="12" height="22" fill={k % 2 ? '#7DB3FF' : '#4C8DF0'} /><polygon points={`${String(8 + k * 13)},23 ${String(15 + k * 13)},16 ${String(22 + k * 13)},23`} fill="#2A5DB0" />{win(13 + k * 13, 27)}</g>)}</>,
    twin: <><rect x="10" y="24" width="18" height="20" fill="#FFFFFF" /><rect x="28" y="24" width="18" height="20" fill="#EAF1FB" /><polygon points="8,26 28,13 48,26" fill="#2A5DB0" />{win(14, 29, '#FFD66B')}{win(38, 29)}</>,
    land: <><path d="M0 40 Q14 30 28 36 T56 34 V56 H0z" fill="#6CBF6A" /><path d="M28 12c-5 0-8 4-8 8 0 6 8 13 8 13s8-7 8-13c0-4-3-8-8-8z" fill="#E0662C" /><circle cx="28" cy="20" r="3" fill="#fff" /></>,
    shophouse: <><rect x="11" y="16" width="34" height="28" fill="#FFFFFF" /><path d="M9 16h38l-3 7H12z" fill="#2E9E6A" /><rect x="15" y="28" width="10" height="16" fill="#4C8DF0" /><rect x="29" y="28" width="12" height="9" fill="#FFD66B" /></>,
    shop: <><rect x="11" y="16" width="34" height="28" fill="#FFFFFF" /><path d="M9 16h38l-3 7H12z" fill="#E0662C" /><rect x="15" y="28" width="10" height="16" fill="#4C8DF0" /><rect x="29" y="28" width="12" height="9" fill="#FFD66B" /></>,
    apartment: <><rect x="12" y="12" width="32" height="32" fill="#7AA7E8" />{Array.from({ length: 12 }, (_, j) => win(15 + (j % 4) * 7, 16 + Math.floor(j / 4) * 8, j === 6 ? '#FFD66B' : undefined))}</>,
    warehouse: <><path d="M8 44V24l20-9 20 9v20z" fill="#9AA9BE" /><rect x="18" y="30" width="20" height="14" fill="#5F6F86" /><path d="M18 34h20M18 38h20" stroke="#9AA9BE" strokeWidth="1.5" /></>,
  };
  return (
    <svg viewBox="0 0 56 56" aria-hidden className="size-14">
      <circle cx="28" cy="28" r="28" fill="#DDEEFF" />
      <rect y="42" width="56" height="14" fill="#9ED39A" />
      {body[type]}
    </svg>
  );
}

/** แผนที่ประกอบ (ไม่ใช่แผนที่จริง) — ใช้เป็นพื้นหลัง แล้ววางหมุดเป็นปุ่ม HTML ทับ */
export function MapArt({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} className="absolute inset-0 size-full">
      <rect width="600" height="600" fill="var(--map-bg)" />
      <path d="M-20 420 C120 380 160 480 300 440 S500 330 640 380 V460 C500 420 420 520 300 520 S100 470 -20 500z" fill="var(--map-water)" />
      <rect x="380" y="90" width="140" height="110" rx="18" fill="var(--map-park)" />
      <circle cx="130" cy="180" r="60" fill="var(--map-park)" />
      <g stroke="var(--map-road)" strokeWidth="14" fill="none" strokeLinecap="round"><path d="M0 120 H600" /><path d="M0 300 C200 280 400 320 600 290" /><path d="M200 0 V600" /><path d="M450 0 C430 200 470 400 440 600" /></g>
      <g stroke="var(--map-road2)" strokeWidth="5" fill="none"><path d="M0 60 H600M0 210 H600M0 360 H600M0 560 H600M90 0 V600M320 0 V600M540 0 V600" /></g>
      <path d="M40 40 L200 200 L320 300 L560 560" stroke="var(--line-bts)" strokeWidth="6" fill="none" />
      <path d="M600 140 C460 160 360 240 300 300 S120 420 0 380" stroke="var(--line-mrt)" strokeWidth="6" fill="none" />
      {[[200, 200], [320, 300], [460, 160]].map(([x, y]) => <circle key={`${String(x)}-${String(y)}`} cx={x} cy={y} r="9" fill="#fff" stroke="var(--map-ink)" strokeWidth="3" />)}
    </svg>
  );
}
