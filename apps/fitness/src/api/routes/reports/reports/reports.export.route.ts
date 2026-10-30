import { toCsv } from '@/api/services/reports/reports/reports.service';
import { parseRange } from '@/api/services/shared/shared/shared.date-range';
import { today } from '@/api/lib/clock/clock/clock';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { getReport } from '@/api/dal/reports/reports/reports.dal';
import { can } from '@/api/lib/auth/auth/auth.rbac';

/** ส่งออกรายงานรายวันเป็น CSV — Route Handler ต้องตรวจสิทธิ์เองเหมือน Server Action (§6.1) */
export async function GET(request: Request): Promise<Response> {
  const session = await requireSession();
  if (!can(session, 'reports.view')) return new Response('ไม่มีสิทธิ์ส่งออกรายงาน', { status: 403 });
  const query = new URL(request.url).searchParams;
  const r = await getReport(session, parseRange({ from: query.get('from'), to: query.get('to') }, today()));
  const checkIns = new Map(r.checkIns.daily.map(d => [d.date, d.value]));
  const rows: (string | number)[][] = [
    ['วันที่', 'รายได้ (บาท)', 'เช็กอิน (คน)'],
    ...r.revenue.daily.map(d => [d.date, (d.value / 100).toFixed(2), checkIns.get(d.date) ?? '']),
  ];
  await audit(session, 'report.export', 'report', r.to);
  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="fitflow-report-${r.range.from}_${r.range.to}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
