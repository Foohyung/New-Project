import { describe, expect, it } from 'vitest';
import { addMonths, buildContract, contractDefaults, leaseEndDate, moneyText, type ContractContext, type Segment } from './template';

const ctx: ContractContext = {
  owner: { name: 'คุณนภา ศรีสุข', idNumber: '3-5099-00000-00-4', address: '19 หมู่ 3 นนทบุรี' },
  client: { name: 'คุณปิยะ มั่นคง', idNumber: '1-1037-00000-00-8', address: '45/7 ลาดพร้าว' },
  agent: { name: 'กฤษดา ใจดี', idNumber: '3-1000-00000-00-1', address: 'BaanHub พญาไท', license: 'นห. 0105-1234' },
  property: { name: 'คอนโด เดอะ ไลน์ อารีย์', unitLabel: '12A05', detail: '2 ห้องนอน · 58 ตร.ม.', location: 'พญาไท กรุงเทพฯ', deed: 'อช.2 เลขที่ 12/2560' },
};
const plain = (segs: Segment[]) => segs.map(s => (typeof s === 'string' ? s : (s.value ?? '____'))).join('');

describe('วันที่ในสัญญา', () => {
  it('บวกเดือนแบบปฏิทิน และตัดวันที่เกินเดือน', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
  });
  it('สัญญาเช่า 12 เดือนสิ้นสุดก่อนวันครบรอบ 1 วัน', () => {
    expect(leaseEndDate('2026-11-01', 12)).toBe('2027-10-31');
  });
  it('เขียนจำนวนเงินเป็นตัวเลขและตัวอักษร', () => {
    expect(moneyText(3_200_000)).toBe('32,000 บาท (สามหมื่นสองพันบาทถ้วน)');
  });
});

describe('สร้างสัญญา', () => {
  it('สัญญาเช่าดึงข้อมูลเจ้าของ ลูกค้า และทรัพย์มาเติมให้', () => {
    const doc = buildContract('lease', ctx, contractDefaults('lease', { salePrice: null, rentPrice: 3_200_000, exclusive: false, commissionText: '' }, '2026-10-24'), 'BH-L-2569-001');
    expect(doc.title).toBe('สัญญาเช่า');
    expect(plain(doc.parties)).toContain('คุณนภา ศรีสุข');
    expect(plain(doc.parties)).toContain('คุณปิยะ มั่นคง');
    expect(plain(doc.clauses[0]!)).toContain('ห้อง/ยูนิต 12A05');
    expect(plain(doc.clauses[1]!)).toContain('ถึงวันที่ 30 ตุลาคม 2570'); // เริ่ม 31 ต.ค. 2569 + 12 เดือน - 1 วัน
    expect(plain(doc.clauses[3]!)).toContain('64,000 บาท'); // ประกัน 2 เดือน
    expect(doc.missing).toEqual([]);
    expect(doc.signers.map(s => s.role)).toEqual(['ผู้ให้เช่า', 'ผู้เช่า']);
  });

  it('รายงานช่องที่ยังว่าง เมื่อยังไม่เลือกลูกค้าหรือไม่ได้กรอก', () => {
    const doc = buildContract('sale', { ...ctx, client: null }, { place: 'สำนักงาน', price: 295_000_000 }, 'X');
    expect(doc.missing).toEqual(expect.arrayContaining(['ชื่อผู้จะซื้อ', 'วันทำสัญญา', 'เงินมัดจำ', 'ยอดคงเหลือ', 'วันโอนกรรมสิทธิ์']));
    expect(doc.missing).not.toContain('ราคาซื้อขาย');
  });

  it('สัญญาจะซื้อจะขายคำนวณยอดคงเหลือ = ราคา - มัดจำ', () => {
    const doc = buildContract('sale', ctx, { price: 295_000_000, deposit: 29_500_000 }, 'X');
    expect(plain(doc.clauses[1]!)).toContain('2,655,000 บาท (สองล้านหกแสนห้าหมื่นห้าพันบาทถ้วน)');
  });

  it('สัญญาแต่งตั้งนายหน้าใส่ข้อมูล agent และแบบ Exclusive', () => {
    const doc = buildContract('agency', ctx, contractDefaults('agency', { salePrice: 790_000_000, rentPrice: null, exclusive: true, commissionText: '3% ของราคาขาย' }, '2026-10-24'), 'X');
    expect(plain(doc.parties)).toContain('นห. 0105-1234');
    expect(plain(doc.clauses[0]!)).toContain('ขาย');
    expect(plain(doc.clauses[1]!)).toContain('Exclusive');
    expect(plain(doc.clauses[2]!)).toContain('3% ของราคาขาย');
    expect(doc.signers[1]).toEqual({ role: 'นายหน้า', name: 'กฤษดา ใจดี' });
  });

  it('ไม่ใส่คำว่า "ห้อง/ยูนิต" เมื่อเป็นทรัพย์ทั้งหลัง', () => {
    const doc = buildContract('sale', { ...ctx, property: { ...ctx.property, unitLabel: 'ทั้งหลัง' } }, {}, 'X');
    expect(plain(doc.clauses[0]!)).not.toContain('ห้อง/ยูนิต');
  });
});
