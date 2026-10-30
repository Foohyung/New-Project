import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_SESSIONS } from '../agent/auth';
import { resetStore, store } from '../agent/store';
import { getContract, listContracts, saveContract } from './agent-contracts';
import { getDocumentFile, listDocuments, uploadDocument } from './agent-documents';
import { addLedgerEntry, listLedger } from './agent-ledger';
import { addUnit, createProperty, getProperty, listOwners, listUnits, updateUnitStatus } from './agent-stock';

const kritsada = DEMO_SESSIONS['ag-1']!;
const thana = DEMO_SESSIONS['ag-2']!;
const admin = DEMO_SESSIONS['ad-1']!;
const pdf = new TextEncoder().encode('%PDF-1.4\n%%EOF');

beforeEach(() => {
  resetStore();
});

describe('ขอบเขตข้อมูลของ agent', () => {
  it('agent เห็นเฉพาะทรัพย์ที่ตัวเองดูแล admin เห็นทั้งหมด', async () => {
    expect(new Set((await listUnits(kritsada)).map(u => u.property.code))).toEqual(new Set(['BH-101', 'BH-102', 'BH-103', 'BH-105']));
    expect(new Set((await listUnits(thana)).map(u => u.property.code))).toEqual(new Set(['BH-104']));
    expect(await listUnits(admin)).toHaveLength(store().units.length);
  });
  it('เปิดทรัพย์ของ agent คนอื่นไม่ได้ (ตอบเหมือนไม่มีข้อมูล)', async () => {
    await expect(getProperty(kritsada, 'BH-104')).rejects.toThrow('NOT_FOUND');
    await expect(getProperty(admin, 'BH-104')).resolves.toMatchObject({ property: { code: 'BH-104' } });
  });
  it('ข้อมูลติดต่อเจ้าของเห็นเฉพาะเจ้าของทรัพย์ในขอบเขต', async () => {
    expect((await listOwners(kritsada)).map(o => o.id)).not.toContain('o3');
    expect((await listOwners(thana)).map(o => o.id)).toEqual(['o3']);
  });
  it('เปลี่ยนสถานะยูนิตของคนอื่นไม่ได้', async () => {
    await expect(updateUnitStatus(kritsada, 'u8', 'reserved', null)).rejects.toThrow('NOT_FOUND');
    await updateUnitStatus(thana, 'u8', 'rented', '2027-10-31');
    expect(store().units.find(u => u.id === 'u8')).toMatchObject({ status: 'rented', leaseEnd: '2027-10-31' });
  });
});

describe('เพิ่มทรัพย์และยูนิต', () => {
  const unit = { label: 'ทั้งหลัง', bedrooms: 2, areaSqm: 90, ownerId: 'o1', salePrice: 350_000_000, rentPrice: undefined, status: 'available' as const, commission: { kind: 'percent' as const, basisPoints: 300 }, exclusive: false, note: '', landSqWah: undefined };
  it('สร้างรหัสทรัพย์ใหม่และผูกกับ agent ที่สร้าง', async () => {
    const p = await createProperty(kritsada, { name: 'บ้านใหม่', type: 'house', location: 'บางนา', province: 'กรุงเทพมหานคร', deed: 'โฉนด 1', ...unit });
    expect(p).toMatchObject({ code: 'BH-106', agentId: 'ag-1' });
    expect((await getProperty(kritsada, 'BH-106')).units).toHaveLength(1);
  });
  it('ใช้เจ้าของที่อยู่นอกขอบเขตไม่ได้ และเลขยูนิตซ้ำไม่ได้', async () => {
    await expect(createProperty(kritsada, { name: 'x', type: 'house', location: 'x', province: 'x', deed: 'x', ...unit, ownerId: 'o3' })).rejects.toThrow('NOT_FOUND');
    await expect(addUnit(kritsada, 'p1', { ...unit, label: '12A01' })).rejects.toThrow('UNIT_TAKEN');
  });
});

describe('สัญญา', () => {
  it('บันทึกสัญญาพร้อมเลขที่ต่อเนื่องและดึงข้อมูลมาเติม', async () => {
    const k = await saveContract(kritsada, { type: 'sale', unitId: 'u3', clientId: 'c2', fields: { price: 295_000_000, deposit: 29_500_000 } });
    expect(k.number).toBe('BH-S-2569-003');
    const { doc } = await getContract(kritsada, k.id);
    expect(doc.signers).toEqual([{ role: 'ผู้จะขาย', name: 'นายสมศักดิ์ วงศ์ไพบูลย์' }, { role: 'ผู้จะซื้อ', name: 'นางสาวอรุณี แสงทอง' }]);
  });
  it('ใช้ลูกค้าหรือยูนิตของ agent คนอื่นไม่ได้', async () => {
    await expect(saveContract(kritsada, { type: 'lease', unitId: 'u1', clientId: 'c4', fields: {} })).rejects.toThrow('NOT_FOUND');
    await expect(saveContract(kritsada, { type: 'lease', unitId: 'u8', clientId: 'c1', fields: {} })).rejects.toThrow('NOT_FOUND');
    expect(await listContracts(thana)).toHaveLength(0);
  });
});

describe('เอกสาร', () => {
  it('อัปโหลดได้เฉพาะไฟล์ที่ตรวจชนิดผ่าน และผูกกับข้อมูลในขอบเขต', async () => {
    const doc = await uploadDocument(kritsada, { name: 'สำเนาบัตร.exe', category: 'id-card', linkType: 'client', linkId: 'c2', expiresAt: null }, pdf);
    expect(doc.name).toBe('สำเนาบัตร.pdf');
    await expect(uploadDocument(kritsada, { name: 'a', category: 'other', linkType: 'owner', linkId: 'o3', expiresAt: null }, pdf)).rejects.toThrow('NOT_FOUND');
    await expect(uploadDocument(kritsada, { name: 'a', category: 'other', linkType: 'owner', linkId: 'o1', expiresAt: null }, new TextEncoder().encode('<html>'))).rejects.toThrow('UPLOAD:type');
  });
  it('agent เปิดไฟล์ของคนอื่นไม่ได้', async () => {
    await expect(getDocumentFile(kritsada, 'f5')).rejects.toThrow('NOT_FOUND');
    expect((await getDocumentFile(thana, 'f5')).bytes.byteLength).toBeGreaterThan(0);
    expect((await listDocuments(kritsada, { category: 'deed' })).map(d => d.id).sort()).toEqual(['f1', 'f4']);
  });
});

describe('บัญชี', () => {
  it('agent เห็นเฉพาะรายการของตัวเอง', async () => {
    expect((await listLedger(kritsada)).every(e => e.agentId === 'ag-1')).toBe(true);
    expect((await listLedger(admin)).length).toBeGreaterThan((await listLedger(kritsada)).length);
  });
  it('หัก ณ ที่จ่าย 3% เฉพาะค่าคอม', async () => {
    const commission = await addLedgerEntry(kritsada, { date: '2026-10-24', category: 'commission-sale', description: 'x', amount: 10_000_000, withholding: true, status: 'settled', propertyId: 'p2' });
    expect(commission).toMatchObject({ kind: 'income', withholding: 300_000 });
    const travel = await addLedgerEntry(kritsada, { date: '2026-10-24', category: 'travel', description: 'x', amount: 50_000, withholding: true, status: 'settled', propertyId: null });
    expect(travel).toMatchObject({ kind: 'expense', withholding: 0 });
    await expect(addLedgerEntry(kritsada, { date: '2026-10-24', category: 'travel', description: 'x', amount: 1, withholding: false, status: 'settled', propertyId: 'p4' })).rejects.toThrow('NOT_FOUND');
  });
});
