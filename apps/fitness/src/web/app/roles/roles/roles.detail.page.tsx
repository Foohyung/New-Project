import type { Metadata } from 'next';
import { RolesScreen } from './roles.page';

export const metadata: Metadata = { title: 'บทบาทและสิทธิ์' };

/** `/roles/<id>` — ดูและแก้ไข role นั้น (ไม่พบ = กลับ `/roles`) */
export default async function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RolesScreen roleId={id} />;
}
