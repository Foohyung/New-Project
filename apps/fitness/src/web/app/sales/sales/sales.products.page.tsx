import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { changeStockAction, createProductAction, deleteProductAction, updateProductAction } from '@/api/actions/sales/sales/sales.actions';
import { listProductBranches, listProducts } from '@/api/dal/sales/sales/sales.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { formatBaht, formatThaiDateOf } from '@/api/lib/utils/utils/utils';
import { AddProductButton, ProductRowActions, ProductThumb } from '@/web/components/sales/sales/sales.products';
import { Badge, Card, EmptyState, PageHeader } from '@/web/components/ui/ui/ui';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';
import { Building2 } from 'lucide-react';

export const metadata: Metadata = { title: 'สินค้าและสต็อก' };

/** สินค้าที่ขายหน้าร้าน: เพิ่ม แก้ไข ลบ รับของเข้า ปรับยอด */
export default async function ProductsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, allowed } = await pageGuard('products.manage');
  if (!allowed) return accessDenied("บทบาทของคุณจัดการสินค้าไม่ได้");
  const branches = session.role === 'admin' ? await listProductBranches(session) : [];
  const params = session.role === 'admin' ? await searchParams : {};
  const requestedBranch = typeof params.branch === 'string' ? params.branch : undefined;

  if (session.role === 'admin' && !requestedBranch) {
    return (
      <>
        <PageHeader kicker="จัดการสินค้าและสต็อกทุกสาขา" title="สินค้าและสต็อก" />
        <Card title="สาขาทั้งหมด" subtitle={`${String(branches.length)} สาขา`}>
          {branches.length === 0 ? <EmptyState>ยังไม่มีสาขาให้จัดการสินค้า</EmptyState> : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {branches.map(branch => (
                <li key={branch.branch}>
                  <Link
                    href={`/products?branch=${encodeURIComponent(branch.branch)}`}
                    className="flex min-h-28 items-center gap-3 rounded-xl border border-line bg-bg p-4 transition-colors hover:border-lime/50 hover:bg-surface-2"
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted"><Building2 aria-hidden className="size-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{branch.branch}</span>
                      <span className="block text-sm text-muted">{String(branch.productCount)} รายการ · เปิดขาย {String(branch.activeCount)} รายการ</span>
                    </span>
                    <Badge tone={branch.active ? 'lime' : 'muted'}>{branch.active ? 'ใช้งาน' : 'ปิดใช้งาน'}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </>
    );
  }

  const branch = session.role === 'admin' ? requestedBranch : session.branch;
  if (!branch || (session.role === 'admin' && !branches.some(item => item.branch === branch))) notFound();

  const products = await listProducts(session, { branch });
  const categories = [...new Set(products.map(p => p.category))];
  const low = products.filter(p => p.active && p.stock <= p.lowStock);

  return (
    <>
      <PageHeader
        kicker={`${branch} · น้ำ อาหารเสริม อุปกรณ์ ที่ขายหน้าร้าน`}
        title="สินค้าและสต็อก"
        back={session.role === 'admin' ? { href: '/products', label: 'สินค้าและสต็อกทุกสาขา' } : undefined}
      />
      {low.length > 0 && (
        <Card title="ใกล้หมด / หมดแล้ว" subtitle="กด 📦 ท้ายแถวเพื่อรับของเข้า">
          <ul className="flex flex-wrap gap-2">
            {low.map(p => <li key={p.id}><Badge tone={p.stock <= 0 ? 'danger' : 'warn'}>{p.name} · เหลือ {p.stock}</Badge></li>)}
          </ul>
        </Card>
      )}
      <Card
        title="สินค้าทั้งหมด"
        subtitle={`${String(products.length)} รายการ · สินค้าที่เคยขายแล้วลบไม่ได้ ให้ปิดขายแทน`}
        action={<AddProductButton action={createProductAction.bind(null, branch)} categories={categories} />}
      >
        {products.length === 0 ? <EmptyState>ยังไม่มีสินค้า กดปุ่ม + มุมขวาล่างเพื่อเพิ่ม</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr><th className="px-3 py-2">สินค้า</th><th className="px-3 py-2 text-right">ราคา</th><th className="px-3 py-2 text-right">คงเหลือ</th><th className="px-3 py-2">แก้ไขล่าสุด</th><th className="w-px whitespace-nowrap px-3 py-2">สถานะ</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map(p => (
                  <tr key={p.id}>
                    <td className="px-3 py-3"><div className="flex items-center gap-3"><ProductThumb product={p} /><div className="min-w-0"><b className="block">{p.name}</b><span className="text-xs text-muted">{p.category}</span></div></div></td>
                    <td className="px-3 py-3 text-right font-display text-base font-bold">{formatBaht(p.priceSatang)}</td>
                    <td className="px-3 py-3 text-right">
                      <b className={p.stock <= 0 ? 'text-danger' : p.stock <= p.lowStock ? 'text-warn' : ''}>{p.stock}</b> ชิ้น
                      <span className="block text-xs text-muted">เตือนที่ ≤ {p.lowStock}</span>
                    </td>
                    <td className="px-3 py-3 text-muted">{formatThaiDateOf(p.updatedAt)}{p.updatedByName && ` · ${p.updatedByName}`}</td>
                    <td className="w-px whitespace-nowrap px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={p.active ? 'lime' : 'muted'}>{p.active ? 'เปิดขาย' : 'ปิดขาย'}</Badge>
                        <ProductRowActions
                          product={p}
                          categories={categories}
                          updateAction={updateProductAction.bind(null, branch)}
                          stockAction={changeStockAction.bind(null, branch)}
                          deleteAction={p.sold ? undefined : deleteProductAction.bind(null, branch, p.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
