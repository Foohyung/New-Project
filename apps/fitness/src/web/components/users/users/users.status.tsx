import type { ManagedUser } from '@/api/types/users/users/users.types';
import { Badge } from '@/web/components/ui/ui/ui';
import { formatThaiDate } from '@/api/lib/utils/utils/utils';

/** สถานะบัญชีรวมช่วงวันที่ใช้งาน (active from / to) — today เป็น 'YYYY-MM-DD' ตามเวลาไทย */
export function UserStatusBadge({ user, today }: { user: Pick<ManagedUser, 'active' | 'activeFrom' | 'activeTo'>; today: string }) {
  const range = user.activeFrom || user.activeTo
    ? `${user.activeFrom ? formatThaiDate(user.activeFrom) : 'ไม่จำกัด'} – ${user.activeTo ? formatThaiDate(user.activeTo) : 'ไม่จำกัด'}`
    : null;
  const [tone, label] = !user.active
    ? (['muted', 'ปิดใช้งาน'] as const)
    : user.activeFrom && today < user.activeFrom
      ? (['cyan', 'ยังไม่ถึงวันเริ่ม'] as const)
      : user.activeTo && today > user.activeTo
        ? (['muted', 'หมดช่วงใช้งาน'] as const)
        : (['lime', 'ใช้งาน'] as const);
  return (
    <span className="inline-flex flex-col gap-0.5">
      <Badge tone={tone}>{label}</Badge>
      {range && <span className="text-xs text-muted">{range}</span>}
    </span>
  );
}
