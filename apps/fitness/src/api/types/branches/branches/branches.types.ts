/** สาขาในหน้าตั้งค่า > สาขา */
export interface BranchDto {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  active: boolean;
  /** บัญชีผู้ใช้ที่อยู่สาขานี้ (สาขาหลัก) — มีบัญชีอยู่ลบสาขาไม่ได้ */
  userCount: number;
  updatedAt: string;
  updatedByName: string | null;
}
