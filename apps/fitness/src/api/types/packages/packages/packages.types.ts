import type { PackageKindInput } from '@/api/schemas/packages/packages/packages.schema';

export type PackageDto = {
  id: string;
  name: string;
  kind: PackageKindInput;
  /** เดือน (time) · วัน (daypass) · ครั้ง (pt) */
  duration: number;
  priceSatang: number;
  description: string;
  active: boolean;
  durationLabel: string;
};

/** สำหรับหน้าจัดการแพ็กเกจ — inUse = จำนวนสมาชิก + รายการชำระ + ค่าใช้จ่ายที่อ้างแพ็กเกจนี้ (> 0 ลบไม่ได้) */
export type ManagedPackageDto = PackageDto & {
  memberCount: number;
  inUse: number;
  updatedAt: string;
  updatedByName: string | null;
};
