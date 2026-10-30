/** รอบแจ้งเตือนต่ออายุ (pure) */

export type Channel = 'line' | 'sms' | 'email';
export type RoundId = 'before-7' | 'before-3' | 'on-day' | 'after-7';

export interface ReminderRound {
  id: RoundId;
  /** วันเทียบกับวันหมดอายุ: -7 = ก่อน 7 วัน, 7 = หลังหมด 7 วัน */
  offsetDays: number;
  enabled: boolean;
  channels: Channel[];
  template: string;
  couponCode: string | null;
}

export const CHANNELS: Channel[] = ['line', 'sms', 'email'];
export const CHANNEL_LABEL: Record<Channel, string> = { line: 'LINE', sms: 'SMS', email: 'อีเมล' };

export const ROUND_LABEL: Record<RoundId, { title: string; hint: string }> = {
  'before-7': { title: 'ก่อน 7 วัน', hint: 'เตือนเบา ๆ พร้อมยอด' },
  'before-3': { title: 'ก่อน 3 วัน', hint: 'แนบคูปองจูงใจ' },
  'on-day': { title: 'วันหมดอายุ', hint: 'ลิงก์จ่ายด่วน' },
  'after-7': { title: 'หลังหมด 7 วัน', hint: 'ข้อความชวนกลับ' },
};

export const TEMPLATE_VARS = ['ชื่อ', 'แพ็กเกจ', 'วันหมดอายุ', 'คูปอง', 'ลิงก์ชำระ'] as const;

/** รอบที่ต้องส่งสำหรับสมาชิกที่เหลือ daysLeft วัน (ติดลบ = หมดมาแล้ว) */
export function roundForDaysLeft(daysLeft: number, rounds: readonly ReminderRound[]): ReminderRound | undefined {
  return rounds.find(r => r.enabled && r.channels.length > 0 && -r.offsetDays === daysLeft);
}

/** แทน {ตัวแปร} ในข้อความ — ตัวแปรที่ไม่รู้จักคงไว้ตามเดิมเพื่อให้เห็นว่าพิมพ์ผิด */
export function renderTemplate(template: string, vars: Partial<Record<(typeof TEMPLATE_VARS)[number], string>>): string {
  return template.replace(/\{([^{}]+)\}/g, (whole, key: string) => vars[key as keyof typeof vars] ?? whole);
}

export function unknownVars(template: string): string[] {
  return [...template.matchAll(/\{([^{}]+)\}/g)].map(m => m[1] ?? '').filter(v => !(TEMPLATE_VARS as readonly string[]).includes(v));
}
