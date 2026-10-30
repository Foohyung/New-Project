import { beforeEach, expect, it } from 'vitest';
import { addOwnerBranch, createManagedUser, deleteManagedUser, getManagedUser, getOwnerDetail, listBranches, listManagedUsers, listOwnerSummaries, listPasswordResetRequests, listUserOptions, removeOwnerBranch, requestPasswordReset, resolvePasswordReset, updateManagedUser } from '@/api/dal/users/users/users.dal';
import { verifyCredentials } from '@/api/lib/auth/auth/auth.accounts';
import { prisma } from '@/api/lib/db/db/db';
import { describeDb, resetDatabase, USERS } from '@/api/test/db/db/db.test-helpers';

const { admin, owner } = USERS;
const base = { password: 'long-enough-pass', name: 'ทดสอบ สาขา', nickname: 'ทด', role: 'front-desk' };

beforeEach(resetDatabase, 30_000);

describeDb('บัญชีผู้ใช้ตามสังกัด', () => {
  it('บัญชีเจ้าของที่ admin สร้างต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก', async () => {
    const user = await createManagedUser(admin, {
      ...base,
      login: 'new-owner@fitflow.test',
      branch: owner.branch,
      role: 'owner',
    });

    await expect(verifyCredentials(user.login, base.password)).resolves.toMatchObject({
      id: user.id,
      role: 'owner',
      mustChangePassword: true,
    });
  });

  it('เจ้าของเพิ่มบัญชีได้เฉพาะสาขาตัวเอง แม้ส่งสาขาอื่นมาในฟอร์ม', async () => {
    const user = await createManagedUser(owner, { ...base, login: 'other-branch@fitflow.test', branch: 'สาขาอื่น' });
    expect(user.branch).toBe(owner.branch);
  });

  it('เจ้าของเห็นเฉพาะบัญชีในสาขาตัวเอง ส่วน admin เห็นทุกสาขา', async () => {
    await createManagedUser(admin, { ...base, login: 'elsewhere@fitflow.test', branch: 'สาขาอื่น' });
    expect((await listManagedUsers(owner)).every(u => u.branch === owner.branch)).toBe(true);
    // admin เห็นเฉพาะบัญชี admin และเจ้าของ — พนักงานดูผ่านหน้าเจ้าของ
    expect((await listManagedUsers(admin)).every(u => u.role === 'admin' || u.role === 'owner')).toBe(true);
    expect((await listManagedUsers(admin)).some(u => u.id === owner.userId)).toBe(true);
  });

  it('เจ้าของไม่เห็นบัญชี admin แม้อยู่สาขาเดียวกัน', async () => {
    await createManagedUser(admin, { ...base, login: 'sameadmin@fitflow.test', branch: owner.branch, role: 'admin' });
    expect((await listManagedUsers(owner)).some(u => u.role === 'admin')).toBe(false);
    expect((await listManagedUsers(admin)).some(u => u.login === 'sameadmin@fitflow.test')).toBe(true);
  });

  it('เจ้าของให้บทบาท admin ไม่ได้', async () => {
    expect((await listUserOptions(owner)).roles.some(r => r.id === 'admin')).toBe(false);
    await expect(createManagedUser(owner, { ...base, login: 'escalate@fitflow.test', branch: owner.branch, role: 'admin' })).rejects.toThrow('INVALID_USER_ROLE');
  });

  it('admin เห็นชื่อเจ้าของของแต่ละสาขา · เจ้าของเห็นเฉพาะสาขาตัวเอง', async () => {
    await createManagedUser(admin, { ...base, login: 'elsewhere@fitflow.test', branch: 'สาขาอื่น' });
    const branches = await listBranches(admin);
    expect(branches.find(b => b.branch === owner.branch)?.owners).toContain(owner.name);
    expect((await listBranches(owner)).map(b => b.branch)).toEqual([owner.branch]);
    // เจ้าของส่ง filter สาขาอื่นมาก็ยังเห็นแค่สาขาตัวเอง
    expect((await listManagedUsers(owner, { branch: 'สาขาอื่น' })).every(u => u.branch === owner.branch)).toBe(true);
  });

  it('เจ้าของหลายสาขา: admin เพิ่มสาขาให้ แล้วเจ้าของเห็นและเพิ่มพนักงานในสาขานั้นได้', async () => {
    await createManagedUser(admin, { ...base, login: 'bangna@fitflow.test', branch: 'สาขาบางนา' });
    expect((await listManagedUsers(owner)).some(u => u.branch === 'สาขาบางนา')).toBe(false);

    await addOwnerBranch(admin, owner.userId, 'สาขาบางนา');
    expect((await listManagedUsers(owner)).some(u => u.login === 'bangna@fitflow.test')).toBe(true);
    expect((await listBranches(owner)).map(b => b.branch)).toEqual([owner.branch, 'สาขาบางนา']);
    const created = await createManagedUser(owner, { ...base, login: 'bangna2@fitflow.test', branch: 'สาขาบางนา' });
    expect(created.branch).toBe('สาขาบางนา');

    const detail = await getOwnerDetail(admin, owner.userId);
    expect(detail?.branches.map(b => [b.branch, b.home])).toEqual([[owner.branch, true], ['สาขาบางนา', false]]);
    expect(detail?.branches[1]?.staff.map(u => u.login).sort()).toEqual(['bangna2@fitflow.test', 'bangna@fitflow.test']);
    expect((await listBranches(admin)).find(b => b.branch === 'สาขาบางนา')?.owners).toContain(owner.name);
    const summary = (await listOwnerSummaries(admin))[owner.userId];
    expect(summary?.branches).toEqual([owner.branch, 'สาขาบางนา']);
    expect(summary?.staffCount).toBe(detail?.branches.reduce((sum, b) => sum + b.staff.filter(u => u.role !== 'owner').length, 0));
    expect(await listOwnerSummaries(owner)).toEqual({});

    await expect(addOwnerBranch(admin, owner.userId, 'สาขาบางนา')).rejects.toThrow('OWNER_BRANCH_TAKEN');
    await expect(addOwnerBranch(admin, owner.userId, owner.branch)).rejects.toThrow('OWNER_BRANCH_TAKEN');
    await removeOwnerBranch(admin, owner.userId, 'สาขาบางนา');
    expect((await listManagedUsers(owner)).some(u => u.branch === 'สาขาบางนา')).toBe(false);
  });

  it('เจ้าของจัดการสาขาของเจ้าของ และเปิดหน้ารายละเอียดเจ้าของไม่ได้', async () => {
    await expect(addOwnerBranch(owner, owner.userId, 'สาขาบางนา')).rejects.toThrow('FORBIDDEN');
    await expect(getOwnerDetail(owner, owner.userId)).rejects.toThrow('FORBIDDEN');
    expect(await getOwnerDetail(admin, USERS.manager.userId)).toBeNull();
  });

  it('admin แก้ไขบัญชีพร้อมช่วงวันที่ใช้งาน และลบบัญชีได้', async () => {
    const user = await createManagedUser(admin, { ...base, login: 'edit-me@fitflow.test', branch: owner.branch, activeFrom: '2026-11-01', activeTo: '2026-11-30' });
    expect([user.activeFrom, user.activeTo]).toEqual(['2026-11-01', '2026-11-30']);
    const input = { login: 'edited@fitflow.test', name: 'แก้ไขแล้ว', nickname: 'แก้', role: 'manager', branch: 'สาขาบางนา', password: '', active: false, activeFrom: null, activeTo: '2026-12-31' };
    const { before, after } = await updateManagedUser(admin, user.id, input);
    expect(before.login).toBe('edit-me@fitflow.test');
    expect(after).toMatchObject({ login: 'edited@fitflow.test', role: 'manager', branch: 'สาขาบางนา', active: false, activeFrom: null, activeTo: '2026-12-31' });
    await deleteManagedUser(admin, user.id);
    expect(await getManagedUser(admin, user.id)).toBeNull();
  });

  it('แก้ไข/ลบบัญชีได้เฉพาะ admin และ admin ล็อกตัวเองออกไม่ได้', async () => {
    const target = await createManagedUser(owner, { ...base, login: 'owner-staff@fitflow.test', branch: owner.branch });
    const input = { login: target.login, name: target.name, nickname: target.nickname, role: 'front-desk', branch: owner.branch, password: '', active: true, activeFrom: null, activeTo: null };
    await expect(updateManagedUser(owner, target.id, input)).rejects.toThrow('FORBIDDEN');
    await expect(deleteManagedUser(owner, target.id)).rejects.toThrow('FORBIDDEN');
    await expect(deleteManagedUser(admin, admin.userId)).rejects.toThrow('USER_SELF_LOCKOUT');
    const self = await getManagedUser(admin, admin.userId);
    if (!self) throw new Error('missing admin');
    await expect(updateManagedUser(admin, admin.userId, { ...self, password: '', role: 'admin', active: false, trainerId: undefined, memberId: undefined })).rejects.toThrow('USER_SELF_LOCKOUT');
  });

  it('ลืมรหัสผ่าน: ส่งคำขอ (ไม่ซ้ำ · ไม่รับ admin) แล้วเจ้าของรีเซ็ตเป็นรหัสชั่วคราวที่บังคับเปลี่ยน', async () => {
    const staff = await createManagedUser(owner, { ...base, login: 'forgot@fitflow.test', branch: owner.branch });
    await requestPasswordReset('FORGOT@fitflow.test');
    await requestPasswordReset('forgot@fitflow.test');
    await requestPasswordReset('no-such-user@fitflow.test');
    const requests = await listPasswordResetRequests(owner);
    expect(requests.map(r => r.user.login)).toEqual(['forgot@fitflow.test']);
    const [request] = requests;
    if (!request) throw new Error('missing request');
    await resolvePasswordReset(owner, request.id, 'reset', '12345678');
    expect((await prisma().user.findUnique({ where: { id: staff.id } }))?.mustChangePassword).toBe(true);
    expect(await listPasswordResetRequests(owner)).toEqual([]);
    await expect(resolvePasswordReset(owner, request.id, 'reset', '12345678')).rejects.toThrow('NOT_FOUND');
  });
});
