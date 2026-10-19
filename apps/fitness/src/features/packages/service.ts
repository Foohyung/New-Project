import type { PackageLike } from '../members/service';

/** ระยะเวลาของแพ็กเกจแบบอ่านง่าย เช่น "3 เดือน" "10 ครั้ง" "1 วัน" */
export function packageDurationLabel(p: PackageLike): string {
  if (p.kind === 'pt') return `${String(p.sessions ?? 0)} ครั้ง`;
  if (p.kind === 'daypass') return `${String(p.days ?? 1)} วัน`;
  return `${String(p.months ?? 1)} เดือน`;
}
