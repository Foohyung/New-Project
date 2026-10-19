'use client';

import { useActionState } from 'react';
import type { ActionResult } from '@/features/shared/action-result';
import { ResultMessage } from './action-button';
import { Dropdown } from './dropdown';
import { TextField } from './field';
import { btn } from './ui';

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/** บันทึกผลการโทร/คุยกับสมาชิก */
export function FollowUpForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <TextField name="note" label="คุยอะไรไปบ้าง" placeholder="เช่น ติดงาน จะกลับมาเดือนหน้า" error={errors.note} />
      <Dropdown
        name="stage"
        label="สถานะ"
        defaultValue="contacted"
        options={[
          { value: 'contacted', label: 'ติดต่อแล้ว', description: 'คุยแล้ว รอดูว่าจะกลับมาไหม' },
          { value: 'won', label: 'กลับมาแล้ว', description: 'ตกลงต่ออายุ / กลับมาเข้ายิมแล้ว' },
          { value: 'todo', label: 'ยังติดต่อไม่ได้', description: 'ไม่รับสาย ให้ลองใหม่' },
        ]}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังบันทึก…' : 'บันทึก'}</button>
        <ResultMessage state={state} />
      </div>
    </form>
  );
}
