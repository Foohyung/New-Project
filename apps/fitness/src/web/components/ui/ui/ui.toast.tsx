'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { btn } from '@/web/components/ui/ui/ui';
import { CircleCheck, CircleAlert, X } from 'lucide-react';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import { useBodyScrollLock } from '@/web/hooks/ui/ui/ui.use-body-scroll-lock';
import { DELETED_FLASH_COOKIE } from '@/api/services/shared/shared/shared.flash';

type Tone = 'success' | 'error';
interface ToastItem { id: number; message: string; tone: Tone }

/** แสดงนานเท่าไร (ms) ก่อนปิดเอง */
const DURATION_MS = 3500;

const listeners = new Set<(item: ToastItem) => void>();
let nextId = 1;

/** แสดง popup แจ้งผลมุมจอ — เรียกจาก client component ใดก็ได้ (ต้องมี <Toaster /> ใน layout) */
export function toast(message: string, tone: Tone = 'success'): void {
  const item = { id: nextId++, message, tone };
  listeners.forEach(fn => {
    fn(item);
  });
}

interface SuccessDialog { id: number; title: string; message: string }
const dialogListeners = new Set<(item: SuccessDialog) => void>();

/** popup กลางจอแจ้งผลสำเร็จ (ต้องกด "ตกลง") — ใช้หลังยืนยันแก้ไข/ลบ ให้เห็นชัดกว่า toast มุมจอ */
export function showSuccess(title: string, message: string): void {
  const item = { id: nextId++, title, message };
  dialogListeners.forEach(fn => {
    fn(item);
  });
}

/**
 * แจ้งเมื่อ Server Action สำเร็จ — ครั้งละหนึ่งผลลัพธ์ (กัน StrictMode เรียก effect ซ้ำ)
 * successTitle = แสดงเป็น popup กลางจอแทน toast มุมจอ
 */
export function useToastOnSuccess(state: ActionResult, successTitle?: string): void {
  const last = useRef<ActionResult>(null);
  useEffect(() => {
    if (state?.ok && last.current !== state) {
      if (successTitle) showSuccess(successTitle, state.message);
      else toast(state.message);
    }
    last.current = state;
  }, [state, successTitle]);
}

/**
 * เรียก Server Action แล้วแจ้งผลทันทีที่ server ตอบ — ไม่รอ effect ของ component
 * (ปุ่มในแถวที่ถูกลบหายไปพร้อมรายการ ถ้ารอ effect popup จะไม่ขึ้น) · Toaster อยู่ใน layout จึงแสดงได้แม้ปุ่มหายไปแล้ว
 * successTitle = popup กลางจอ · ไม่ส่ง = toast มุมจอ · errorToast = ไม่สำเร็จแสดง toast สีแดง (ปุ่มไอคอนที่ไม่มีที่แสดงข้อความ)
 */
export function useNotifyingAction(
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>,
  { successTitle, errorToast = false }: { successTitle?: string; errorToast?: boolean } = {},
) {
  const [state, setState] = useState<ActionResult>(null);
  const [pending, startTransition] = useTransition();
  const run = (formData: FormData) => {
    startTransition(async () => {
      const result = await action(state, formData);
      if (result?.ok) {
        if (successTitle) showSuccess(successTitle, result.message);
        else toast(result.message);
      } else if (result && errorToast) {
        toast(result.message, 'error');
      }
      setState(result);
    });
  };
  return { state, run, pending };
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const add = (item: ToastItem) => {
      setItems(list => [...list.slice(-2), item]);
      window.setTimeout(() => {
        setItems(list => list.filter(t => t.id !== item.id));
      }, DURATION_MS);
    };
    listeners.add(add);
    return () => {
      listeners.delete(add);
    };
  }, []);

  const close = (id: number) => {
    setItems(list => list.filter(t => t.id !== id));
  };

  return (
    <>
    <SuccessDialogHost />
    {/* มือถืออยู่เหนือ bottom bar · จอใหญ่มุมขวาบน */}
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] flex flex-col items-center gap-2 md:inset-x-auto md:top-6 md:right-6 md:bottom-auto md:items-end">
      {items.map(item => (
        <div
          key={item.id}
          role={item.tone === 'error' ? 'alert' : 'status'}
          className={`ff-pop-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border bg-surface px-4 py-3 shadow-2xl shadow-black/40 ${item.tone === 'error' ? 'border-danger/50' : 'border-lime/50'}`}
        >
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${item.tone === 'error' ? 'bg-danger/15 text-danger' : 'bg-lime/15 text-lime'}`}>
            {item.tone === 'error' ? <CircleAlert aria-hidden className="size-5" /> : <CircleCheck aria-hidden className="size-5" />}
          </span>
          <p className="min-w-0 flex-1 text-sm font-semibold text-ink">{item.message}</p>
          <button type="button" onClick={() => { close(item.id); }} aria-label="ปิดการแจ้งเตือน" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink">
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ))}
    </div>
    </>
  );
}

function SuccessDialogHost() {
  const [item, setItem] = useState<SuccessDialog | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  useBodyScrollLock(Boolean(item));

  useEffect(() => {
    const show = (next: SuccessDialog) => {
      setItem(next);
    };
    dialogListeners.add(show);
    return () => {
      dialogListeners.delete(show);
    };
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (item && !dialog.open) dialog.showModal();
    if (!item && dialog.open) dialog.close();
  }, [item]);

  const close = () => {
    setItem(null);
  };

  return (
    <dialog
      ref={ref}
      aria-modal="true"
      aria-labelledby="ff-success-title"
      onCancel={event => { event.preventDefault(); close(); }}
      onClick={event => { if (event.target === event.currentTarget) close(); }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-lime/40 bg-surface p-0 font-normal break-words whitespace-normal text-ink shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-sm"
    >
      {item && (
        <div key={item.id} className="ff-pop-in flex flex-col items-center gap-3 p-6 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-lime/15 text-lime">
            <CircleCheck aria-hidden className="size-8" />
          </span>
          <h2 id="ff-success-title" className="font-display text-lg font-semibold">{item.title}</h2>
          <p className="text-sm text-muted">{item.message}</p>
          <button type="button" autoFocus onClick={close} className={`${btn.primary} mt-2 w-full`}>ตกลง</button>
        </div>
      )}
    </dialog>
  );
}

/**
 * popup หลัง server redirect: ?deleted=1 (ลบจากหน้ารายละเอียดที่หายไปแล้ว — ชื่ออ่านจาก cookie ไม่ใส่ใน URL)
 * · ?password=changed (เปลี่ยนรหัสผ่าน · รับ ?passwordChanged=1 แบบเดิมด้วย)
 * · ?denied=1 (เปิดหน้าที่ไม่มีสิทธิ์แล้วถูกพากลับมา — accessDenied())
 * แสดงครั้งเดียวแล้วเอาพารามิเตอร์ออกจาก URL · ต้องอยู่ใน <Suspense> (useSearchParams)
 */
export function DeletedFlash() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const deleted = params.get('deleted');
  const passwordChanged = params.get('password') === 'changed' || params.get('passwordChanged') === '1';
  const denied = params.get('denied') === '1';
  useEffect(() => {
    if (!deleted && !passwordChanged && !denied) return;
    if (denied) toast('บัญชีนี้ไม่มีสิทธิ์เปิดหน้านั้น จึงพากลับมาหน้าเดิม', 'error');
    else if (deleted) {
      const cookie = document.cookie.split('; ').find(c => c.startsWith(`${DELETED_FLASH_COOKIE}=`));
      const name = cookie ? decodeURIComponent(cookie.slice(DELETED_FLASH_COOKIE.length + 1)) : '';
      document.cookie = `${DELETED_FLASH_COOKIE}=; path=/; max-age=0`;
      showSuccess('ลบสำเร็จ', name ? `ลบ ${name} แล้ว` : 'ลบข้อมูลแล้ว');
    } else showSuccess('เปลี่ยนรหัสผ่านสำเร็จ', 'เข้าสู่ระบบอีกครั้งด้วยรหัสผ่านใหม่');
    const rest = new URLSearchParams(params);
    for (const key of ['deleted', 'password', 'passwordChanged', 'denied']) rest.delete(key);
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [deleted, passwordChanged, denied, params, pathname, router]);
  return null;
}
