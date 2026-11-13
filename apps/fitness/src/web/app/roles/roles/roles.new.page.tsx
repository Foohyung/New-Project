import type { Metadata } from 'next';
import { RolesScreen } from './roles.page';

export const metadata: Metadata = { title: 'เพิ่ม role' };

/** `/roles/new` — ฟอร์มสร้าง role ใหม่ */
export default function NewRolePage() {
  return <RolesScreen creating />;
}
