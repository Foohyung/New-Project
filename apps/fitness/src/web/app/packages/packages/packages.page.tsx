import type { Metadata } from 'next';
import { formatBaht, formatThaiDateOf } from '@/api/lib/utils/utils/utils';
import { AddPackageButton, PACKAGE_KIND_LABEL, PackageRowActions } from '@/web/components/packages/packages/packages.form';
import { Badge, Card, EmptyState, PageHeader } from '@/web/components/ui/ui/ui';
import { createPackageAction, deletePackageAction, updatePackageAction } from '@/api/actions/packages/packages/packages.actions';
import { listManagedPackages } from '@/api/dal/packages/packages/packages.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';

export const metadata: Metadata = { title: 'แพ็กเกจ' };

/** เพิ่ม แก้ไข และลบแพ็กเกจ (สิทธิ์ packages.manage) */
export default async function PackagesPage() {
  const { session, allowed } = await pageGuard('packages.manage');
  if (!allowed) return accessDenied("เฉพาะเจ้าของยิมเท่านั้นที่จัดการแพ็กเกจได้");
  const packages = await listManagedPackages(session);
  const active = packages.filter(p => p.active).length;
  return (
    <>
      <PageHeader kicker="ราคาใหม่ใช้กับรายการชำระถัดไป รายการที่ชำระแล้วไม่เปลี่ยน" title="แพ็กเกจและราคา" />
      <Card title="แพ็กเกจทั้งหมด" subtitle={`${String(packages.length)} แพ็กเกจ · เปิดขาย ${String(active)} แพ็กเกจ · แพ็กเกจที่มีสมาชิกหรือประวัติการชำระลบไม่ได้ ให้ปิดขายแทน`}>
        {packages.length === 0 ? <EmptyState>ยังไม่มีแพ็กเกจ กดปุ่ม + มุมขวาล่างเพื่อเพิ่ม</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr><th className="px-3 py-2">แพ็กเกจ</th><th className="px-3 py-2">ประเภท</th><th className="px-3 py-2 text-right">ราคา</th><th className="px-3 py-2">สมาชิก</th><th className="px-3 py-2">แก้ไขล่าสุด</th><th className="w-px whitespace-nowrap px-3 py-2">สถานะ</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {packages.map(p => (
                  <tr key={p.id}>
                    <td className="px-3 py-3"><b className="block">{p.name}</b><span className="text-xs text-muted">{p.description}</span></td>
                    <td className="px-3 py-3">{PACKAGE_KIND_LABEL[p.kind]} · {p.durationLabel}</td>
                    <td className="px-3 py-3 text-right font-display text-base font-bold">{formatBaht(p.priceSatang)}</td>
                    <td className="px-3 py-3">{p.memberCount} คน</td>
                    <td className="px-3 py-3 text-muted">{formatThaiDateOf(p.updatedAt)}{p.updatedByName && ` · ${p.updatedByName}`}</td>
                    <td className="w-px whitespace-nowrap px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={p.active ? 'lime' : 'muted'}>{p.active ? 'เปิดขาย' : 'ปิดขาย'}</Badge>
                        <PackageRowActions pkg={p} updateAction={updatePackageAction} deleteAction={p.inUse === 0 ? deletePackageAction.bind(null, p.id) : undefined} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AddPackageButton action={createPackageAction} />
      </Card>
    </>
  );
}
