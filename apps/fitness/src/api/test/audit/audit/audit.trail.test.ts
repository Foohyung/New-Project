import { describe, expect, it } from 'vitest';
import { auditRecord, changedFields, REDACTED, SYSTEM_ACTOR } from '@/api/services/audit/audit/audit.trail';

const desk = { id: 'u-desk', name: 'ปริญญา ท.', role: 'front-desk' } as const;
const at = new Date('2026-10-15T02:00:00Z');

describe('changedFields', () => {
  it('เก็บเฉพาะฟิลด์ที่เปลี่ยน และไม่นับ updatedAt/updatedById', () => {
    const before = { name: 'ก', phone: '0800000101', note: null, updatedAt: new Date(0), updatedById: 'x' };
    const after = { name: 'ข', phone: '0800000101', note: 'VIP', updatedAt: at, updatedById: 'y' };
    expect(changedFields(before, after)).toEqual({ before: { name: 'ก', note: null }, after: { name: 'ข', note: 'VIP' } });
  });

  it('เทียบ Date และ Decimal ตามค่า ไม่ใช่ตาม object', () => {
    const decimal = (v: string) => ({ toFixed: () => v, toString: () => v });
    expect(changedFields({ on: new Date(at), kg: decimal('72.0') }, { on: new Date(at), kg: decimal('72.0') })).toEqual({ before: {}, after: {} });
  });
});

describe('auditRecord', () => {
  it('เก็บชื่อผู้แก้ ณ เวลานั้น และค่าเดิม/ค่าใหม่', () => {
    const r = auditRecord({ actor: desk, action: 'update', entityType: 'members', entityId: 'm1', before: { name: 'ก', email: null }, after: { name: 'ข', email: null }, at });
    expect(r).toMatchObject({ actorId: 'u-desk', actorName: 'ปริญญา ท.', actorRole: 'front-desk', occurredAt: '2026-10-15T02:00:00.000Z', before: { name: 'ก' }, after: { name: 'ข' } });
  });

  it('ไม่เก็บค่ารหัสผ่าน/token แต่ยังบอกว่าเปลี่ยน', () => {
    const r = auditRecord({ actor: desk, action: 'update', entityType: 'users', entityId: 'u1', before: { passwordHash: 'a:1' }, after: { passwordHash: 'b:2' } });
    expect(r.before).toEqual({ passwordHash: REDACTED });
    expect(r.after).toEqual({ passwordHash: REDACTED });
  });

  it('ข้อมูลสุขภาพเก็บแค่ชื่อฟิลด์ ไม่มีค่า', () => {
    const r = auditRecord({ actor: desk, action: 'update', entityType: 'health_profiles', entityId: 'h1', before: { weightKg: 72, goal: 'gain' }, after: { weightKg: 70, goal: 'gain' } });
    expect(r.after).toEqual({ weightKg: REDACTED });
    expect(JSON.stringify(r)).not.toContain('70');
  });

  it('งานระบบไม่มี actorId แต่มีชื่อ · ไม่ส่ง before/after = ไม่มี diff', () => {
    const r = auditRecord({ actor: { ...SYSTEM_ACTOR, name: 'ระบบตัดบัตรอัตโนมัติ' }, action: 'charge.fail', entityType: 'charges', entityId: 'c1' });
    expect(r).toMatchObject({ actorId: null, actorName: 'ระบบตัดบัตรอัตโนมัติ', actorRole: null, before: null, after: null });
  });

  it('create มีแค่ after · delete มีแค่ before', () => {
    expect(auditRecord({ actor: desk, action: 'create', entityType: 'coupons', entityId: 'c', before: null, after: { code: 'A' } })).toMatchObject({ before: null, after: { code: 'A' } });
    expect(auditRecord({ actor: desk, action: 'delete', entityType: 'coupons', entityId: 'c', before: { code: 'A' }, after: null })).toMatchObject({ before: { code: 'A' }, after: null });
  });
});
