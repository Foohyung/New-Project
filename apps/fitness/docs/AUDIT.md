# Audit trail — ใคร แก้อะไร เมื่อไร

## 1. คอลัมน์มาตรฐานทุกตาราง (`prisma/schema.prisma`)

| ชนิดตาราง | คอลัมน์ |
|---|---|
| แก้ไขได้ (users, packages, members, trainers, classes, bookings, pt_sessions, payments, coupons, charges, reminder_rounds, reminder_logs, follow_ups, workout_plans, health_profiles, meal_logs) | `created_at` · `created_by_id` · `created_by_name` · `updated_at` · `updated_by_id` · `updated_by_name` |
| เพิ่มอย่างเดียว (check_ins) | `at` · `created_by_id` · `created_by_name` (พนักงานที่กด · null = สมาชิกสแกน QR เอง) |
| ระบบ (sessions, counters, audit_logs) | sessions มี `created_at` · `created_by_name`, counters มี `updated_at` · `updated_by_name`, audit_logs มี `actor_*` ของตัวเอง |

- เพิ่มคอลัมน์ด้วย migration `prisma/migrations/0002_audit_columns` และ `prisma/migrations/0003_audit_names`
- `*_by_id` เก็บ `users.id` โดยไม่ผูก FK ผู้ใช้จึงลบได้โดยไม่กระทบข้อมูล
- `*_by_name` เก็บชื่อผู้ทำรายการโดยตรง ณ ตอนที่บันทึก
- ค่า null หรือ 'ระบบ' หมายถึงงานระบบ (cron, webhook) หรือข้อมูลตั้งต้น
- คอลัมน์ชุดนี้บอกแค่สถานะ "ล่าสุด" ส่วน **ประวัติทุกครั้ง** (รวมการลบ) อยู่ใน `audit_logs`
  - การลบเก็บเป็น `action = delete` พร้อม `before`

## 2. ตาราง `audit_logs`

| คอลัมน์ | ความหมาย |
|---|---|
| `occurred_at` | เวลาที่เกิด |
| `actor_id` | ผู้แก้ (null = ระบบ) |
| `actor_name` | ชื่อผู้แก้ ณ ตอนนั้น (ยังอ่านได้แม้ภายหลังผู้ใช้ถูกลบหรือเปลี่ยนชื่อ) |
| `actor_role` | บทบาทของผู้แก้ |
| `action` | `create` / `update` / `delete` / `restore` หรือ action ธุรกิจ เช่น `payment.confirm` |
| `entity_type` | ชื่อตาราง |
| `entity_id` | แถวที่ถูกแก้ |
| `before` / `after` | **เฉพาะฟิลด์ที่เปลี่ยน** |
| `branch_id` | สาขา |
| `ip` · `user_agent` · `request_id` | ที่มาของคำขอ |

ค่าที่ไม่เก็บ (`src/api/services/audit/audit/audit.trail.ts`):
- `passwordHash`, `totpSecretEnc`, `gatewayToken`, `tokenHash` เก็บเป็น `"[redacted]"` คือรู้ว่าเปลี่ยน แต่ไม่รู้ค่า
- `health_profiles` และ `meal_logs` ไม่เก็บค่าเลยทุกฟิลด์ (PDPA ม.26) เมื่อสมาชิกถอนความยินยอม ข้อมูลจึงลบได้จริง และ log ไม่มีข้อมูลสุขภาพค้างอยู่

กฎสิทธิ์ (ใส่ใน migration):

```sql
REVOKE UPDATE, DELETE ON fitflow.audit_logs FROM 'fitflow_app'@'%';
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs is append-only';
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs is append-only';
```

## 3. วิธีเขียน log

**ระยะที่ 1 (ตอนนี้):** `audit(session, action, entityType, entityId, { before, after })` ใน `src/api/lib/audit/audit/audit.log.ts`
- ทุก Server Action เรียกฟังก์ชันนี้อยู่แล้ว
- ส่ง `before`/`after` เพิ่มได้ เพื่อเก็บค่าที่เปลี่ยน

**ระยะที่ 2 (เมื่อติดตั้ง Prisma):** ครอบ client ด้วย extension ให้ทุกการเขียน (`create` / `update` / `upsert` / `delete`) ทำ 3 อย่างนี้อัตโนมัติ:
1. เติม `createdById` / `updatedById` ให้เอง
2. คำนวณค่าเดิม/ค่าใหม่
3. insert `audit_logs` ใน transaction เดียวกัน (ถ้า log ล้ม การแก้ก็ไม่ถูกบันทึก)

ผลคือไม่มี DAL ไหนลืม log ได้ ตัวอย่างโค้ด:

```ts
// src/api/lib/db/db/db.audited.ts
import { auditRecord, type Actor } from '@/features/audit/trail';

export const prismaFor = (actor: Actor) => base.$extends({
  query: {
    $allModels: {
      async update({ model, args, query }) {
        const table = TABLE[model];                                   // ชื่อตารางจาก @@map
        return base.$transaction(async tx => {
          const before = await tx[model].findUnique({ where: args.where });
          const after = await query({ ...args, data: { ...args.data, updatedById: actor.id } });
          await tx.auditLog.create({ data: auditRecord({ actor, action: 'update', entityType: table, entityId: after.id, before, after }) });
          return after;
        });
      },
      // create / delete / upsert ทำแบบเดียวกัน (delete = before อย่างเดียว · create = after อย่างเดียว)
    },
  },
});
```

- ใน DAL: `prismaFor({ id: session.userId, name: session.name, role: session.role })`
- งานระบบ: `prismaFor({ ...SYSTEM_ACTOR, name: 'ระบบตัดบัตรอัตโนมัติ' })`

## 4. ตัวอย่างคำถามที่ตอบได้

```sql
-- ประวัติทั้งหมดของสมาชิกคนหนึ่ง
SELECT occurred_at, actor_name, action, `before`, `after` FROM audit_logs
WHERE entity_type = 'members' AND entity_id = ? ORDER BY occurred_at;

-- พนักงานคนนี้แก้อะไรบ้างวันนี้
SELECT * FROM audit_logs WHERE actor_id = ? AND occurred_at >= CURDATE();
```

## 5. action ของบัญชีผู้ใช้และสมาชิก

| action | เมื่อไร | `before` / `after` |
|---|---|---|
| `user.create` · `user.update` · `user.delete` | admin/เจ้าของเพิ่มบัญชี · admin แก้ไข/ลบบัญชี | ข้อมูลบัญชีรวม `activeFrom`/`activeTo` (ไม่มีรหัสผ่าน — เปลี่ยนรหัสเก็บเป็น `password: 'changed'`) |
| `owner.branch.add` · `owner.branch.remove` | admin เพิ่ม/เอาสาขาเพิ่มเติมของเจ้าของ | `{ branch }` |
| `user.password.reset` · `user.password.reset-dismiss` | พนักงานรีเซ็ต/ปิดคำขอ "ลืมรหัสผ่าน" | — |
| `auth.password.change` | ผู้ใช้ตั้งรหัสใหม่ที่ขั้นที่ 2 ของหน้า login | `{ forced }` |
| `member.create` · `member.update` · `member.delete` | สมัคร (สร้างบัญชีเข้าสู่ระบบให้ด้วย) · แก้ข้อมูลติดต่อ · ลบถาวร | ลบเก็บรหัส ชื่อ เบอร์ และจำนวนรายการชำระไว้ใน `before` เพราะข้อมูลจริงถูกลบหมด |
| `branch.branding.update` | เจ้าของแก้ชื่อ Gym สี โลโก้ | โลโก้เก็บแค่ `uploaded` ไม่เก็บไฟล์ |
