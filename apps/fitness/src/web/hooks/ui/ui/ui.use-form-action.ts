'use client';

import { startTransition, useActionState, type SyntheticEvent } from 'react';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';

/**
 * ส่งฟอร์มผ่าน onSubmit แทน `<form action>` — React 19 ล้างฟอร์มทุกครั้งหลัง action
 * ทำให้ค่าที่กรอกและตัวเลือกหายเมื่อมี error · แบบนี้ฟอร์มคงค่าเดิมไว้ให้แก้ต่อ
 */
export function useFormAction(action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>) {
  const [state, dispatch, pending] = useActionState<ActionResult, FormData>(action, null);
  const submit = (data: FormData) => {
    startTransition(() => {
      dispatch(data);
    });
  };
  const onSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit(new FormData(e.currentTarget));
  };
  /** submit = ส่งข้อมูลเอง (ใช้กับ ConfirmForm onSubmitData หลังกดยืนยัน) */
  return { state, onSubmit, submit, pending };
}
