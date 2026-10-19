'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/server/auth';
import { audit } from '@/server/audit';
import { now, today } from '@/server/clock';
import { findMemberForCheckIn, recordCheckIn } from '@/server/dal/members';
import { parseMemberQr } from '../members/service';
import { knownFailure } from '../shared/action-result';
import { CheckInSchema } from './schema';
import { decideCheckIn, REJECT_MESSAGE } from './service';

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
