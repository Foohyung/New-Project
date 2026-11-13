'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import { Check, ChevronDown, ImageOff, PackagePlus, Pencil, Plus } from 'lucide-react';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import type { ProductDto } from '@/api/types/sales/sales/sales.types';
import { useFormAction } from '@/web/hooks/ui/ui/ui.use-form-action';
import { ResultMessage } from '@/web/components/ui/ui/ui.action-button';
import { ConfirmForm } from '@/web/components/ui/ui/ui.confirm-form';
import { DeleteIconButton } from '@/web/components/ui/ui/ui.delete-button';
import { ChoiceCard, TextField } from '@/web/components/ui/ui/ui.field';
import { FileDrop } from '@/web/components/ui/ui/ui.file-drop';
import { FormDialog } from '@/web/components/ui/ui/ui.form-dialog';
import { btn, inputClass } from '@/web/components/ui/ui/ui';

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** รูปสินค้าขนาดย่อ · ไม่มีรูปแสดงไอคอนแทน */
export function ProductThumb({ product, className = 'size-12' }: { product: Pick<ProductDto, 'name' | 'imageUrl'>; className?: string }) {
  return product.imageUrl
    ? <Image src={product.imageUrl} alt={product.name} width={160} height={160} unoptimized className={`${className} shrink-0 rounded-xl border border-line bg-bg object-cover`} />
    : <span aria-hidden className={`${className} flex shrink-0 items-center justify-center rounded-xl border border-dashed border-line bg-bg text-faint`}><ImageOff className="size-1/3" /></span>;
}

function useCloseOnSuccess(state: ActionResult, onDone: () => void): void {
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
}

function CategoryField({ categories, defaultValue, error, id }: { categories: string[]; defaultValue?: string; error?: string; id: string }) {
  const [value, setValue] = useState(defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const query = value.trim().toLocaleLowerCase('th');
  const options = categories.filter(category => !query || category.toLocaleLowerCase('th').includes(query));
  const hasExactMatch = categories.some(category => category.toLocaleLowerCase('th') === query);
  const addNew = Boolean(query) && !hasExactMatch;
  const optionCount = options.length + Number(addNew);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (open && optionCount > 0) document.getElementById(`${listId}-option-${String(active)}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, listId, open, optionCount]);

  const choose = (category: string) => {
    setValue(category);
    setOpen(false);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setActive(0);
        setOpen(true);
      } else if (optionCount > 0) {
        setActive(index => (index + 1) % optionCount);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setActive(Math.max(optionCount - 1, 0));
        setOpen(true);
      } else if (optionCount > 0) {
        setActive(index => (index - 1 + optionCount) % optionCount);
      }
    } else if (event.key === 'Enter' && open && optionCount > 0) {
      event.preventDefault();
      choose(active < options.length ? options[active] ?? value : value.trim());
    } else if (event.key === 'Escape') {
      setOpen(false);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="flex min-w-0 flex-col gap-1.5">
      <label id={labelId} htmlFor={id} className="text-sm font-semibold">หมวด</label>
      <div className="relative">
        <input
          id={id}
          name="category"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && optionCount > 0 ? `${listId}-option-${String(active)}` : undefined}
          aria-labelledby={labelId}
          aria-invalid={error ? true : undefined}
          aria-describedby={[`${id}-hint`, error ? errorId : ''].filter(Boolean).join(' ')}
          className={`${inputClass} pr-12 aria-expanded:border-lime`}
          placeholder="เช่น เครื่องดื่ม"
          autoComplete="off"
          required
          value={value}
          onChange={event => {
            setValue(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => {
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="แสดงหมวดสินค้า"
          onPointerDown={event => {
            event.preventDefault();
          }}
          onClick={() => {
            setOpen(current => !current);
            setActive(0);
          }}
          className="absolute inset-y-0 right-1 grid w-10 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ChevronDown aria-hidden className={`size-5 transition-transform ${open ? 'rotate-180 text-lime' : ''}`} />
        </button>
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-labelledby={labelId}
            className="absolute top-full z-50 mt-2 max-h-[calc(5*2.75rem+0.75rem)] w-full overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-1.5 shadow-[0_18px_40px_-12px_#000]"
          >
            {options.map((category, index) => (
              <li
                key={category}
                id={`${listId}-option-${String(index)}`}
                role="option"
                aria-selected={value === category}
                onPointerDown={event => {
                  event.preventDefault();
                }}
                onPointerMove={() => {
                  setActive(index);
                }}
                onClick={() => {
                  choose(category);
                }}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm transition-colors ${active === index ? 'bg-lime/12 text-lime' : 'hover:bg-lime/12 hover:text-lime'} ${value === category ? 'font-semibold text-lime' : ''}`}
              >
                <span className="min-w-0 flex-1 truncate font-medium">{category}</span>
                <Check aria-hidden className={`size-4 shrink-0 text-lime ${value === category ? '' : 'invisible'}`} />
              </li>
            ))}
            {addNew && (
              <li
                id={`${listId}-option-${String(options.length)}`}
                role="option"
                aria-selected={false}
                onPointerDown={event => {
                  event.preventDefault();
                }}
                onPointerMove={() => {
                  setActive(options.length);
                }}
                onClick={() => {
                  choose(value.trim());
                }}
                className={`mt-1 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-t border-line px-3 text-sm text-lime transition-colors ${active === options.length ? 'bg-lime/12' : 'hover:bg-lime/12'}`}
              >
                <Plus aria-hidden className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">ใช้หมวดใหม่ “{value.trim()}”</span>
              </li>
            )}
            {optionCount === 0 && <li className="px-3 py-3 text-sm text-muted">เริ่มพิมพ์เพื่อเพิ่มหมวดใหม่</li>}
          </ul>
        )}
      </div>
      <p id={hintId} className="text-xs text-muted">พิมพ์หมวดใหม่หรือเลือกหมวดที่มีอยู่</p>
      {error && <p id={errorId} className="text-sm text-danger">{error}</p>}
    </div>
  );
}

function ProductFields({ product, categories, errors, idPrefix }: { product?: ProductDto; categories: string[]; errors: Record<string, string>; idPrefix: string }) {
  return (
    <>
      <TextField name="name" id={`${idPrefix}-name`} label="ชื่อสินค้า" placeholder="เช่น น้ำดื่ม 600 มล." defaultValue={product?.name} autoComplete="off" error={errors.name} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <CategoryField categories={categories} defaultValue={product?.category} error={errors.category} id={`${idPrefix}-category`} />
        <TextField name="price" id={`${idPrefix}-price`} label="ราคาขาย (บาท)" type="number" inputMode="decimal" min={1} step="0.01" defaultValue={product ? product.priceSatang / 100 : undefined} error={errors.price} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {!product && <TextField name="stock" id={`${idPrefix}-stock`} label="สต็อกตั้งต้น (ชิ้น)" type="number" inputMode="numeric" min={0} step={1} defaultValue={0} error={errors.stock} />}
        <TextField name="lowStock" id={`${idPrefix}-low`} label="แจ้งเตือนเมื่อเหลือไม่เกิน (ชิ้น)" type="number" inputMode="numeric" min={0} step={1} defaultValue={product?.lowStock ?? 5} error={errors.lowStock} />
      </div>
      <FileDrop id={`${idPrefix}-image`} name="imageFile" label={product?.imageUrl ? 'เปลี่ยนรูปสินค้า' : 'รูปสินค้า (ไม่บังคับ)'} accept="image/png,image/jpeg,image/webp" maxBytes={MAX_IMAGE_BYTES} hint="PNG, JPEG หรือ WebP ไม่เกิน 2 MB · แนะนำรูปสี่เหลี่ยมจัตุรัส" error={errors.imageFile} />
      {product?.imageUrl && (
        <div className="flex items-center gap-3">
          <ProductThumb product={product} className="size-16" />
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" name="clearImage" className="size-5 accent-danger" />
            ลบรูปปัจจุบัน <span className="text-muted">(ถ้าเลือกไฟล์ใหม่ จะใช้ไฟล์ใหม่แทน)</span>
          </label>
        </div>
      )}
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="size-5 accent-lime" />
        เปิดขาย <span className="text-muted">(แสดงในหน้าขายสินค้า)</span>
      </label>
    </>
  );
}

function ProductCreateForm({ action, categories, onDone }: { action: Action; categories: string[]; onDone: () => void }) {
  const { state, onSubmit, pending } = useFormAction(action);
  useCloseOnSuccess(state, onDone);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <ProductFields categories={categories} errors={errors} idPrefix="new-product" />
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ResultMessage state={state} />
        <button type="button" onClick={onDone} className={btn.secondary}>ยกเลิก</button>
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังเพิ่ม…' : 'เพิ่มสินค้า'}</button>
      </div>
    </form>
  );
}

function ProductEditForm({ product, action, categories, onDone }: { product: ProductDto; action: Action; categories: string[]; onDone: () => void }) {
  const { state, submit, pending } = useFormAction(action);
  useCloseOnSuccess(state, onDone);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <ConfirmForm onSubmitData={submit} confirm={`บันทึกการแก้ไขสินค้า "${product.name}"? ราคาใหม่ใช้กับบิลถัดไป`} confirmTitle="ยืนยันการแก้ไข" confirmLabel="บันทึก" noValidate className="flex flex-col gap-4">
      <input type="hidden" name="id" value={product.id} />
      <ProductFields product={product} categories={categories} errors={errors} idPrefix={`edit-${product.id}`} />
      <p className="text-xs text-muted">จำนวนสต็อกแก้ที่ปุ่ม 📦 รับของเข้า/ปรับยอด เพื่อให้มีประวัติทุกครั้ง</p>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ResultMessage state={state} successTitle="แก้ไขสำเร็จ" />
        <button type="button" onClick={onDone} className={btn.secondary}>ยกเลิก</button>
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}</button>
      </div>
    </ConfirmForm>
  );
}

function StockForm({ product, action, onDone }: { product: ProductDto; action: Action; onDone: () => void }) {
  const { state, onSubmit, pending } = useFormAction(action);
  const [mode, setMode] = useState<'receive' | 'adjust'>('receive');
  useCloseOnSuccess(state, onDone);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="productId" value={product.id} />
      <div className="grid gap-2 sm:grid-cols-2">
        <ChoiceCard name="mode" value="receive" checked={mode === 'receive'} onChange={() => { setMode('receive'); }} title="รับของเข้า" detail="บวกเพิ่มจากที่มีอยู่" />
        <ChoiceCard name="mode" value="adjust" checked={mode === 'adjust'} onChange={() => { setMode('adjust'); }} title="ปรับยอดตามที่นับได้" detail="ตั้งจำนวนคงเหลือใหม่" />
      </div>
      <TextField key={mode} name="qty" id={`stock-${product.id}-qty`} label={mode === 'receive' ? 'จำนวนที่รับเข้า (ชิ้น)' : 'นับได้จริง (ชิ้น)'} type="number" inputMode="numeric" min={0} step={1} defaultValue={mode === 'adjust' ? product.stock : undefined} error={errors.qty} hint={`ตอนนี้ในระบบมี ${String(product.stock)} ชิ้น`} required />
      <TextField name="note" id={`stock-${product.id}-note`} label="หมายเหตุ" placeholder={mode === 'receive' ? 'เช่น ล็อตจากร้านส่ง' : 'เช่น ขวดแตก 2 ขวด'} error={errors.note} optional />
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ResultMessage state={state} />
        <button type="button" onClick={onDone} className={btn.secondary}>ยกเลิก</button>
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? 'กำลังบันทึก…' : 'บันทึกสต็อก'}</button>
      </div>
    </form>
  );
}

/** ปุ่มเพิ่มสินค้ามุมขวาบนของหัวข้อรายการ → popup เพิ่มสินค้า */
export function AddProductButton({ action, categories }: { action: Action; categories: string[] }) {
  const [open, setOpen] = useState(false);
  const close = () => { setOpen(false); };
  return (
    <>
      <button type="button" onClick={() => { setOpen(true); }} className={btn.primary}>
        <Plus aria-hidden className="size-4" />
        เพิ่มสินค้า
      </button>
      <FormDialog open={open} onClose={close} title="เพิ่มสินค้า" subtitle="เปิดขายแล้วจะแสดงในหน้าขายสินค้าทันที">
        <ProductCreateForm action={action} categories={categories} onDone={close} />
      </FormDialog>
    </>
  );
}

const iconBtn = 'inline-flex size-11 items-center justify-center rounded-xl text-muted';

/** ปุ่ม 📦 ✏️ 🗑 ท้ายแถว — 📦 รับของเข้า/ปรับยอด · ✏️ แก้ไข (popup) · สินค้าที่เคยขายแล้วไม่มีปุ่มลบ (ปิดขายแทน) */
export function ProductRowActions({ product, categories, updateAction, stockAction, deleteAction }: { product: ProductDto; categories: string[]; updateAction: Action; stockAction: Action; deleteAction?: Action }) {
  const [open, setOpen] = useState<'edit' | 'stock' | null>(null);
  const close = () => { setOpen(null); };
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => { setOpen('stock'); }} aria-label={`รับของเข้า/ปรับยอด ${product.name}`} title="รับของเข้า/ปรับยอด" className={`${iconBtn} hover:bg-lime/10 hover:text-lime`}><PackagePlus aria-hidden className="size-5" /></button>
      <button type="button" onClick={() => { setOpen('edit'); }} aria-label={`แก้ไข ${product.name}`} title="แก้ไข" className={`${iconBtn} hover:bg-cyan/10 hover:text-cyan`}><Pencil aria-hidden className="size-5" /></button>
      {deleteAction && <DeleteIconButton label={`ลบ ${product.name}`} confirm={`ลบสินค้า ${product.name} ถาวร? (ประวัติใน audit log ยังอยู่)`} confirmLabel="ลบสินค้า" action={deleteAction} />}
      <FormDialog open={open === 'edit'} onClose={close} title={`แก้ไข ${product.name}`}>
        <ProductEditForm product={product} action={updateAction} categories={categories} onDone={close} />
      </FormDialog>
      <FormDialog open={open === 'stock'} onClose={close} title={`สต็อก ${product.name}`} subtitle={`คงเหลือ ${String(product.stock)} ชิ้น`}>
        <StockForm product={product} action={stockAction} onDone={close} />
      </FormDialog>
    </div>
  );
}
