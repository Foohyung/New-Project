import { toCsv } from '@/features/reports/service';
import { requireSession } from '@/server/auth';
import { audit } from '@/server/audit';
import { getReport } from '@/server/dal/reports';
import { can } from '@/server/rbac';

/** ส่งออกรายงานรายวันเป็น CSV — Route Handler ต้องตรวจสิทธิ์เองเหมือน Server Action (§6.1) */
export async function GET(): Promise<Response> {
  const session = await requireSession();
  if (!can(session, 'reports.view')) return new Response('ไม่มีสิทธิ์ส่งออกรายงาน', { status: 403 });
  const r = await getReport(session);
  const checkIns = new Map(r.checkIns.daily.map(d => [d.date, d.value]));
  const rows: (string | number)[][] = [
    ['วันที่', 'รายได้ (บาท)', 'เช็กอิน (คน)'],
    ...r.revenue.daily.map(d => [d.date, (d.value / 100).toFixed(2), checkIns.get(d.date) ?? '']),
  ];
  await audit(session, 'report.export', 'report', r.to);
  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="fitflow-report-${r.to}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
