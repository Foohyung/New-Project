'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, UserRound } from 'lucide-react';
import { DEFAULT_MEMBER_PASSWORD } from '@/api/services/members/members/members.service';
import { FormDialog } from '@/web/components/ui/ui/ui.form-dialog';
import { btn } from '@/web/components/ui/ui/ui';

export function MemberCreatedDialog({ memberId, name, phone, email }: {
  memberId: string;
  name: string;
  phone: string;
  email: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const close = () => {
    setOpen(false);
    router.replace(`/members/${encodeURIComponent(memberId)}`, { scroll: false });
  };

  return (
    <FormDialog open={open} onClose={close} title="สมัครสมาชิกสำเร็จ" subtitle={`เพิ่ม ${name} เรียบร้อยแล้ว`}>
      <div className="grid gap-3">
        <section className="rounded-2xl border border-line bg-bg p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <UserRound aria-hidden className="size-4 text-lime" />
            ข้อมูลติดต่อ
          </h3>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">เบอร์โทร</dt>
              <dd className="font-medium">{phone}</dd>
            </div>
            {email && (
              <div className="min-w-0">
                <dt className="text-xs text-muted">อีเมล</dt>
                <dd className="break-all font-medium">{email}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="rounded-2xl border border-lime/30 bg-lime/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <KeyRound aria-hidden className="size-4 text-lime" />
            ข้อมูลเข้าสู่ระบบ
          </h3>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">ชื่อผู้ใช้ (เบอร์โทร)</dt>
              <dd className="font-mono font-semibold">{phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">รหัสผ่านเริ่มต้น</dt>
              <dd className="font-mono font-semibold text-lime">{DEFAULT_MEMBER_PASSWORD}</dd>
            </div>
          </dl>
        </section>

        <p className="text-sm text-muted">เพื่อความปลอดภัย ระบบจะให้สมาชิกเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบครั้งแรก</p>
        <div className="flex justify-end pt-1">
          <button type="button" onClick={close} className={btn.primary}>รับทราบ</button>
        </div>
      </div>
    </FormDialog>
  );
}
