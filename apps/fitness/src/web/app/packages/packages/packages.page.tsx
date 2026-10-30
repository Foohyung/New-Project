import { formatBaht } from '@/api/lib/utils/utils/utils';
import type { Metadata } from 'next';
import { PackageForm } from '@/web/components/packages/packages/packages.form';
import { Badge, Card, Forbidden, PageHeader } from '@/web/components/ui/ui/ui';
import { updatePackageAction } from '@/api/actions/packages/packages/packages.actions';
import { listPackages } from '@/api/dal/packages/packages/packages.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';

export const metadata: Metadata = { title: 'แพ็กเกจ' };

const KIND = { time: 'สมาชิกรายเดือน', pt: 'เทรนเนอร์ส่วนตัว', daypass: 'รายวัน' } as const;

export default async function PackagesPage() {
  const { session, allowed } = await pageGuard('packages.manage');
  if (!allowed) return <Forbidden message="เฉพาะเจ้าของยิมเท่านั้นที่แก้ราคาแพ็กเกจได้" />;
  const packages = await listPackages(session);
  return (
    <>
      <PageHeader kicker="ราคาใหม่ใช้กับรายการชำระถัดไป รายการที่ชำระแล้วไม่เปลี่ยน" title="แพ็กเกจและราคา" />
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        {packages.map(p => (
          <Card key={p.id} title={p.name} subtitle={`${KIND[p.kind]} · ${p.durationLabel}`} action={<div className="flex items-center gap-2"><b className="font-display text-xl">{formatBaht(p.priceSatang)}</b>{!p.active && <Badge>ปิดขาย</Badge>}</div>}>
            <PackageForm pkg={p} action={updatePackageAction.bind(null, p.id)} />
          </Card>
        ))}
      </div>
    </>
  );
}
