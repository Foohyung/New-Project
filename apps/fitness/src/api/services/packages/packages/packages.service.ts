import type { PackageLike } from '@/api/services/members/members/members.service';

/** ระยะเวลาของแพ็กเกจแบบอ่านง่าย เช่น "3 เดือน" "10 ครั้ง" "1 วัน" */
export function packageDurationLabel(p: PackageLike): string {
  if (p.kind === 'pt') return `${String(p.sessions ?? 0)} ครั้ง`;
  if (p.kind === 'daypass') return `${String(p.days ?? 1)} วัน`;
  return `${String(p.months ?? 1)} เดือน`;
}

/** ใช้เรียงแพ็กเกจจากระยะสั้นไปยาว โดยคิด 1 เดือนเป็น 30 วัน และวางแพ็กเกจ PT ไว้ท้ายสุด */
export function packageDurationSortDays(p: PackageLike): number {
  if (p.kind === 'pt') return Number.POSITIVE_INFINITY;
  if (p.kind === 'daypass') return p.days ?? 1;
  return (p.months ?? 1) * 30;
}

export function comparePackageDuration(a: PackageLike, b: PackageLike): number {
  const daysA = packageDurationSortDays(a);
  const daysB = packageDurationSortDays(b);
  return daysA === daysB ? 0 : daysA < daysB ? -1 : 1;
}
