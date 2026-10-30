import { describe, expect, it } from 'vitest';
import { CheckInSchema } from '@/api/schemas/checkin/checkin/checkin.schema';
import { decideCheckIn } from '@/api/services/checkin/checkin/checkin.service';

const today = '2026-10-15';

describe('decideCheckIn', () => {
  it('อนุญาตสมาชิกที่ยังไม่หมดอายุ พร้อมวันคงเหลือ', () => {
    expect(decideCheckIn({ expiresOn: '2026-10-18', frozen: false }, today)).toEqual({ allowed: true, daysLeft: 3 });
  });

  it('ปฏิเสธการเช็กอินเมื่อสมาชิกหมดอายุ', () => {
    expect(decideCheckIn({ expiresOn: '2026-10-09', frozen: false }, today)).toEqual({ allowed: false, reason: 'expired' });
  });

  it('ปฏิเสธการเช็กอินเมื่อพักสมาชิก', () => {
    expect(decideCheckIn({ expiresOn: '2027-01-02', frozen: true }, today)).toEqual({ allowed: false, reason: 'frozen' });
  });

  it('แจ้งเมื่อไม่พบสมาชิก', () => {
    expect(decideCheckIn(undefined, today)).toEqual({ allowed: false, reason: 'not-found' });
  });
});

describe('CheckInSchema', () => {
  it('ตัดช่องว่างและปฏิเสธข้อความสั้นเกินไป', () => {
    expect(CheckInSchema.safeParse({ query: '  08 ' }).success).toBe(false);
    expect(CheckInSchema.parse({ query: ' FF-002318 ' }).query).toBe('FF-002318');
  });
});
