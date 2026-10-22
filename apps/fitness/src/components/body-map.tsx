'use client';

import { useId } from 'react';
import { MUSCLE_LABEL, type Muscle } from '@/features/workouts/catalog';

/*
 * ภาพร่างกายแบบกายวิภาค ด้านหน้า + ด้านหลัง (ดีไซน์ใน designs/coach-options.html แบบ A)
 * วาดครึ่งซ้ายแล้วสะท้อนเป็นครึ่งขวา · viewBox 200×420 แกนกลาง x=100
 */
const SKIN = [
  'M100,10 C89,10 84,19 84,31 C84,41 88,50 94,53 L100,54 Z',
  'M100,48 L92,48 C92,56 90,62 82,67 L100,72 Z',
  'M100,62 L86,64 C78,68 70,69 64,72 C58,92 62,118 68,136 C70,166 72,194 72,214 L100,218 Z',
  'M64,72 C52,76 46,92 46,110 C45,130 45,148 47,164 L62,166 C64,140 66,110 68,88 Z',
  'M47,160 C41,182 39,204 42,224 L52,226 C56,206 60,186 63,164 Z',
  'M42,222 C37,230 36,242 39,250 C43,256 49,254 51,248 C53,240 53,231 52,224 Z',
  'M72,210 C64,240 63,272 67,300 L91,304 C96,276 99,246 100,216 Z',
  'M68,298 C66,310 67,322 70,330 L88,330 C90,320 91,309 90,300 Z',
  'M70,326 C63,348 65,376 71,396 L83,398 C88,376 89,350 87,326 Z',
  'M71,394 C64,402 62,411 66,416 L87,416 C89,409 87,401 83,396 Z',
];
const DELT = 'M68,69 C56,70 47,80 46,96 C46,104 48,110 51,115 C55,103 62,92 72,84 C75,78 73,71 68,69 Z';
const FOREARM = 'M48,168 C43,184 41,200 42,214 C45,216 48,214 50,210 C54,196 58,182 61,170 C57,172 52,172 48,168 Z';
const absBlock = (y: number) => `M89,${String(y)} L98,${String(y)} L98,${String(y + 17)} L89,${String(y + 17)} Q88,${String(y + 17)} 88,${String(y + 15)} L88,${String(y + 2)} Q88,${String(y)} 89,${String(y)} Z`;

type Part = readonly [Muscle, string];
const FRONT: readonly Part[] = [
  ['traps', 'M92,56 C88,62 80,67 70,70 L86,72 C90,66 92,62 92,56 Z'],
  ['upper-chest', 'M99,78 L99,98 C89,99 76,98 64,98 C64,96 65,94 66,92 C71,83 84,78 99,78 Z'],
  ['lower-chest', 'M99,98 L99,120 C90,124 79,123 70,117 C64,111 63,104 64,98 C76,98 89,99 99,98 Z'],
  ['shoulders', DELT],
  ['biceps', 'M51,118 C47,128 46,144 48,158 C52,164 58,164 61,158 C63,144 62,130 59,118 C56,114 53,114 51,118 Z'],
  ['forearms', FOREARM],
  ['obliques', 'M70,121 L80,125 L79,131 L69,129 Z'],
  ['obliques', 'M70,133 L80,136 L79,142 L70,141 Z'],
  ['obliques', 'M84,126 C77,129 72,136 72,146 C72,164 74,180 78,194 C81,198 84,200 86,200 L86,128 Z'],
  ['upper-abs', absBlock(125)],
  ['middle-abs', absBlock(145)],
  ['middle-abs', absBlock(165)],
  ['lower-abs', 'M88,185 L98,185 L98,214 C94,213 90,207 88,199 Z'],
  ['quads', 'M72,216 C64,240 63,268 67,292 C70,300 74,304 78,302 C78,276 79,246 82,224 C79,219 76,217 72,216 Z'],
  ['quads', 'M83,222 C80,246 79,274 80,298 C83,302 87,302 89,298 C92,274 92,248 89,226 C87,222 85,221 83,222 Z'],
  ['quads', 'M91,268 C94,278 94,292 91,302 C89,305 87,303 88,298 C90,288 90,278 91,268 Z'],
  ['adductors', 'M92,224 C97,236 99,250 98,262 C96,268 94,272 92,276 C93,258 94,240 92,224 Z'],
  ['calves', 'M76,332 C73,350 73,370 75,388 L80,388 C82,370 83,350 82,332 Z'],
  ['calves', 'M71,330 C66,342 66,356 69,368 C71,364 72,350 74,334 Z'],
];
const BACK: readonly Part[] = [
  ['lats', 'M72,112 C68,126 68,142 73,156 C79,168 87,178 95,184 C96,168 96,154 94,142 C88,132 82,122 76,116 Z'],
  ['traps', 'M100,52 L100,134 C95,122 88,106 81,92 C76,84 72,78 68,73 C78,70 88,64 93,54 Z'],
  ['upper-back', 'M77,94 C73,100 71,108 73,115 C79,117 85,113 89,107 C86,101 82,97 77,94 Z'],
  ['lower-back', 'M93,146 L99,142 L99,202 L90,200 C92,182 93,164 93,146 Z'],
  ['rear-delts', DELT],
  ['triceps', 'M50,116 C46,128 45,144 47,158 C51,163 56,162 58,156 C60,146 61,130 60,118 C57,113 52,113 50,116 Z'],
  ['forearms', FOREARM],
  ['glutes', 'M100,204 L100,250 C91,257 79,256 73,246 C68,232 69,216 76,208 C84,201 92,201 100,204 Z'],
  ['hamstrings', 'M72,250 C66,272 66,294 71,308 C74,312 79,312 81,308 C82,290 83,272 84,254 C80,254 76,253 72,250 Z'],
  ['hamstrings', 'M84,254 C83,274 82,292 82,308 C85,313 90,312 92,306 C95,290 98,272 99,250 C94,254 89,255 84,254 Z'],
  ['calves', 'M71,328 C64,342 64,360 69,372 C72,377 78,375 80,368 C80,354 80,340 80,328 Z'],
  ['calves', 'M80,328 C80,344 80,358 81,370 C84,377 89,375 90,368 C93,354 92,340 88,328 Z'],
];
/** เส้นใยกล้ามเนื้อบาง ๆ ให้ดูมีมิติ */
const LINES_FRONT = ['M98,102 C90,108 80,112 70,114', 'M54,124 C53,138 53,148 54,156'];
const LINES_BACK = ['M90,70 C88,86 92,110 98,126', 'M80,128 C82,146 88,164 94,176', 'M86,212 C83,226 84,238 88,248'];
const MIRROR = 'matrix(-1 0 0 1 200 0)';

function Figure({ label, parts, lines, selected, onToggle, ids }: { label: string; parts: readonly Part[]; lines: string[]; selected: readonly Muscle[]; onToggle: (m: Muscle) => void; ids: Record<'base' | 'on', string> }) {
  return (
    <figure className="m-0 flex flex-col items-center gap-1">
      {/* แตะบนภาพได้ด้วยเมาส์/นิ้ว · ผู้ใช้คีย์บอร์ดและ screen reader ใช้ปุ่มชื่อกล้ามเนื้อด้านล่างแทน */}
      <svg viewBox="33 6 134 414" aria-hidden className="h-auto w-full max-w-[170px]">
        <g className="fill-ink/[.07]">
          {SKIN.map(d => (
            <g key={d}>
              <path d={d} />
              <path d={d} transform={MIRROR} />
            </g>
          ))}
        </g>
        {parts.map(([m, d], i) => {
          const on = selected.includes(m);
          return (
            <g
              key={`${m}-${String(i)}`}
              onClick={() => {
                onToggle(m);
              }}
              fill={`url(#${on ? ids.on : ids.base})`}
              className={`cursor-pointer stroke-surface [stroke-linejoin:round] [stroke-width:1] ${on ? '' : 'hover:opacity-80'}`}
            >
              <title>{MUSCLE_LABEL[m]}</title>
              <path d={d} />
              <path d={d} transform={MIRROR} />
            </g>
          );
        })}
        <g className="pointer-events-none fill-none stroke-surface/70 [stroke-width:1]">
          {lines.map(d => (
            <g key={d}>
              <path d={d} />
              <path d={d} transform={MIRROR} />
            </g>
          ))}
        </g>
      </svg>
      <figcaption className="text-xs text-faint">{label}</figcaption>
    </figure>
  );
}

/** ภาพร่างกายด้านหน้า/หลัง แตะกล้ามเนื้อเพื่อเลือกหรือยกเลิก */
export function BodyMap({ selected, onToggle }: { selected: readonly Muscle[]; onToggle: (m: Muscle) => void }) {
  const uid = useId().replace(/:/g, '');
  const ids = { base: `${uid}-base`, on: `${uid}-on` };
  return (
    <div className="grid grid-cols-2 gap-1">
      <svg width="0" height="0" aria-hidden className="absolute">
        <defs>
          <radialGradient id={ids.base} cx=".38" cy=".32" r=".85">
            <stop offset="0" className="[stop-color:color-mix(in_srgb,var(--color-ink)_30%,var(--color-surface))]" />
            <stop offset=".55" className="[stop-color:color-mix(in_srgb,var(--color-ink)_15%,var(--color-surface))]" />
          </radialGradient>
          <radialGradient id={ids.on} cx=".38" cy=".32" r=".85">
            <stop offset="0" className="[stop-color:color-mix(in_srgb,#fff_45%,var(--color-lime))]" />
            <stop offset=".55" className="[stop-color:var(--color-lime)]" />
            <stop offset="1" className="[stop-color:color-mix(in_srgb,#000_22%,var(--color-lime))]" />
          </radialGradient>
        </defs>
      </svg>
      <Figure label="ด้านหน้า" parts={FRONT} lines={LINES_FRONT} selected={selected} onToggle={onToggle} ids={ids} />
      <Figure label="ด้านหลัง" parts={BACK} lines={LINES_BACK} selected={selected} onToggle={onToggle} ids={ids} />
    </div>
  );
}
