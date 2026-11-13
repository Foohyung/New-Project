import 'server-only';
import { today } from '@/api/lib/clock/clock/clock';
import type { Tx } from '@/api/lib/db/db/db';
import { DEFAULT_RECEIPT_FORMAT, formatReceiptNo, receiptSequenceReader } from '@/api/services/payments/payments/payments.service';

/** รูปแบบเลขที่ใบเสร็จของสาขา (ยังไม่ตั้ง = รูปแบบเริ่มต้น) */
export async function receiptFormatOf(tx: Pick<Tx, 'branchBranding'>, branch: string | null): Promise<string> {
  if (!branch) return DEFAULT_RECEIPT_FORMAT;
  const row = await tx.branchBranding.findUnique({ where: { branch }, select: { receiptNumberFormat: true } });
  return row?.receiptNumberFormat ?? DEFAULT_RECEIPT_FORMAT;
}

/**
 * ออกเลขที่ใบเสร็จถัดไปของสาขา (เรียกใน transaction)
 * นับต่อจากเลขสูงสุดที่ออกไปแล้วในรูปแบบและงวดเดียวกัน — ทั้งรับชำระ ขายหน้าร้าน และสมัครคอร์ส ใช้ชุดเลขเดียวกัน
 * ล็อกแถว counters.receipt ไว้ก่อน จึงไม่ได้เลขซ้ำเมื่อออกพร้อมกัน · สาขาที่ใช้รูปแบบเหมือนกันจะนับต่อกัน (เลขไม่ชนกัน)
 */
export async function nextReceiptNo(tx: Tx, branch: string | null): Promise<string> {
  await tx.counter.upsert({ where: { name: 'receipt' }, create: { name: 'receipt', value: 1 }, update: { value: { increment: 1 } } });
  return (await receiptNumbers(tx, await receiptFormatOf(tx, branch))).next;
}

/** เลขล่าสุดที่ออกไปแล้ว (null = งวดนี้ยังไม่มี) และเลขถัดไป ของรูปแบบนี้ในงวดปัจจุบัน — ใช้แสดงในหน้าตั้งค่าได้ (ไม่จองเลข) */
export async function receiptNumbers(tx: Pick<Tx, 'payment' | 'sale' | 'courseEnrollment'>, format: string): Promise<{ last: string | null; next: string }> {
  const date = today();
  const { prefix, read } = receiptSequenceReader(format, date);
  const where = { receiptNo: { startsWith: prefix } };
  const select = { receiptNo: true } as const;
  const [payments, sales, enrollments] = await Promise.all([
    tx.payment.findMany({ where, select }),
    tx.sale.findMany({ where, select }),
    tx.courseEnrollment.findMany({ where, select }),
  ]);
  const last = Math.max(0, ...[...payments, ...sales, ...enrollments].map(r => read(r.receiptNo) ?? 0));
  return { last: last ? formatReceiptNo(format, last, date) : null, next: formatReceiptNo(format, last + 1, date) };
}
