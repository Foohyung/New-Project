'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/api/lib/auth/auth/auth.session';
import { audit } from '@/api/lib/audit/audit/audit.log';
import { now, today } from '@/api/lib/clock/clock/clock';
import { findMemberForCheckIn, recordCheckIn, selfCheckIn } from '@/api/dal/members/members/members.dal';
import { parseMemberQr } from '@/api/services/members/members/members.service';
import { knownFailure, type ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { formatThaiTime } from '@/api/lib/utils/utils/utils';
import { CheckInSchema } from '@/api/schemas/checkin/checkin/checkin.schema';
import { decideCheckIn, REJECT_MESSAGE } from '@/api/services/checkin/checkin/checkin.service';

export interface CheckInMember {
  id: string;
  name: string;
  code: string;
  packageName: string;
  expiresOn: string;
  daysLeft: number;
}

export type CheckInState =
  | { ok: true; member: CheckInMember }
  | { ok: false; code: 'VALIDATION_ERROR' | 'FORBIDDEN' | 'not-found' | 'expired' | 'frozen'; message: string; member?: CheckInMember }
  | null;

export async function checkInAction(_prev: CheckInState, formData: FormData): Promise<CheckInState> {
  // 1. Authenticate
  const session = await requireSession();

  // 2. Validate — รับได้ทั้งข้อความจาก QR (FITFLOW:FF-xxxxxx) เบอร์โทร และรหัสสมาชิก
  const raw = formData.get('query');
  const parsed = CheckInSchema.safeParse({ query: parseMemberQr(typeof raw === 'string' ? raw : '') });
  if (!parsed.success) {
    return { ok: false, code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' };
  }

  // 3. Authorize — DAL ตรวจสิทธิ์ checkin.use และคืนเฉพาะสมาชิกที่ตรงตัว
  let found: Awaited<ReturnType<typeof findMemberForCheckIn>>;
  try {
    found = await findMemberForCheckIn(session, parsed.data.query);
  } catch (error) {
    const failure = knownFailure(error);
    return { ok: false, code: 'FORBIDDEN', message: failure?.message ?? 'ทำรายการไม่ได้' };
  }

  // 4. Execute
  const decision = decideCheckIn(found, today());
  const member = found && { id: found.id, name: found.name, code: found.code, packageName: found.packageName, expiresOn: found.expiresOn, daysLeft: found.daysLeft };
  if (found) {
    await recordCheckIn(session, found.id, decision.allowed, now());
    // 5. Audit
    await audit(session, decision.allowed ? 'checkin.allowed' : 'checkin.rejected', 'member', found.id);
  }
  revalidatePath('/');
  revalidatePath('/checkin');

  if (decision.allowed && member) return { ok: true, member };
  const reason = decision.allowed ? 'not-found' : decision.reason;
  return { ok: false, code: reason, message: REJECT_MESSAGE[reason], ...(member && { member }) };
}

/** สมาชิกกดเช็กอินเองในหน้าบัตรสมาชิก */
export async function selfCheckInAction(_prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  let result: Awaited<ReturnType<typeof selfCheckIn>>;
  try {
    result = await selfCheckIn(session, now());
  } catch (error) {
    return knownFailure(error);
  }
  if (!result.allowed) {
    if (session.memberId) await audit(session, 'checkin.self.rejected', 'member', session.memberId);
    return { ok: false, message: result.reason === 'not-found' ? 'บัญชีนี้ไม่ได้ผูกกับข้อมูลสมาชิก ติดต่อเคาน์เตอร์' : REJECT_MESSAGE[result.reason] };
  }
  if (!result.repeated && session.memberId) await audit(session, 'checkin.self', 'member', session.memberId);
  revalidatePath('/me');
  revalidatePath('/');
  revalidatePath('/checkin');
  const time = formatThaiTime(result.at);
  return result.repeated
    ? { ok: true, message: `คุณเช็กอินไปแล้วเมื่อ ${time} น. · ใช้ได้อีก ${String(result.daysLeft)} วัน` }
    : { ok: true, message: `เช็กอินเวลา ${time} น. · ใช้ได้อีก ${String(result.daysLeft)} วัน ขอให้สนุกกับการออกกำลังกาย!` };
}
