'use client';

import { useState } from 'react';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { formatBaht } from '@/api/lib/utils/utils/utils';
import { METHOD_LABEL, type PaymentMethod } from '@/api/services/payments/payments/payments.service';
import type { ActionResult } from '@/api/types/shared/shared/shared.action-result';
import type { ProductDto } from '@/api/types/sales/sales/sales.types';
import type { PaymentSetup } from '@/api/types/payments/payments/payments.types';
import { PromptPayCheckout } from '@/web/components/payments/payments/promptpay-checkout';
import { promptPayPayload } from '@/api/services/payments/payments/payments.service';
import { useFormAction } from '@/web/hooks/ui/ui/ui.use-form-action';
import { ResultMessage } from '@/web/components/ui/ui/ui.action-button';
import { ConfirmForm } from '@/web/components/ui/ui/ui.confirm-form';
import { Badge, EmptyState, btn } from '@/web/components/ui/ui/ui';
import { ProductThumb } from '@/web/components/sales/sales/sales.products';
import { FileDrop } from '@/web/components/ui/ui/ui.file-drop';
import { PurchaseCouponField, type AppliedCoupon } from '@/web/components/coupons/coupons/coupons.field';

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
const METHODS: PaymentMethod[] = ['cash', 'promptpay', 'transfer', 'card'];
const MAX_SLIP_BYTES = 10 * 1024 * 1024;

/** หน้าขาย: แตะสินค้าเพื่อใส่ตะกร้า → เลือกวิธีชำระ → ยืนยันรับเงิน (ตัดสต็อกและออกเลขใบเสร็จที่ server) */
export function PosRegister({ products, action, buyerMode = false, setup }: { products: ProductDto[]; action: Action; buyerMode?: boolean; setup: PaymentSetup }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<PaymentMethod>(setup.methods[0] ?? 'cash');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipResetKey, setSlipResetKey] = useState(0);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [promptPayReadyFor, setPromptPayReadyFor] = useState<string | null>(null);
  const { state, submit, pending } = useFormAction(action);
  // ขายสำเร็จ → ล้างตะกร้า (ปรับ state ระหว่าง render เมื่อผลลัพธ์เปลี่ยน แทน effect)
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state?.ok) {
      setCart({});
      setSlipFile(null);
      setSlipResetKey(key => key + 1);
      setCoupon(null);
    }
  }

  const byId = new Map(products.map(p => [p.id, p]));
  const lines = Object.entries(cart).flatMap(([id, qty]) => {
    const p = byId.get(id);
    return p ? [{ product: p, qty }] : [];
  });
  const listPriceSatang = lines.reduce((s, l) => s + l.product.priceSatang * l.qty, 0);
  const discountSatang = coupon?.discountSatang ?? 0;
  const total = listPriceSatang - discountSatang;
  const promptPayKey = `${method}:${String(total)}`;
  const promptPayReady = promptPayReadyFor === promptPayKey;
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const setQty = (id: string, qty: number) => {
    setSlipFile(null);
    setCoupon(null);
    setCart(c => {
      const value = Math.min(qty, byId.get(id)?.stock ?? qty);
      // คงลำดับเดิมในตะกร้า · จำนวน 0 = เอาออก
      if (!(id in c)) return value > 0 ? { ...c, [id]: value } : c;
      return Object.fromEntries(Object.entries(c).flatMap(([key, v]) => (key !== id ? [[key, v]] : value > 0 ? [[key, value]] : [])));
    });
  };
  const categories = [...new Set(products.map(p => p.category))];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-5">
      <section aria-label="สินค้า" className="flex min-w-0 flex-col gap-4">
        {products.length === 0 ? <EmptyState>ยังไม่มีสินค้าเปิดขาย เพิ่มสินค้าที่เมนูสินค้าและสต็อก</EmptyState> : categories.map(cat => (
          <div key={cat}>
            <h2 className="mb-2 text-sm font-semibold text-muted">{cat}</h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {products.filter(p => p.category === cat).map(p => {
                const inCart = cart[p.id] ?? 0;
                const soldOut = p.stock <= 0;
                return (
                  <li key={p.id} className={`flex h-full flex-col gap-1 rounded-2xl border bg-surface p-3 ${inCart ? 'border-lime/60' : 'border-line'} ${soldOut ? 'opacity-50' : ''}`}>
                    <ProductThumb product={p} className="aspect-[4/3] h-auto w-full" />
                    <b className="line-clamp-2 text-sm font-semibold">{p.name}</b>
                    <span className="font-display text-lg font-semibold">{formatBaht(p.priceSatang)}</span>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted">
                      {soldOut ? <Badge tone="danger">หมด</Badge> : p.stock <= p.lowStock ? <Badge tone="warn">เหลือ {p.stock}</Badge> : <span>เหลือ {p.stock}</span>}
                      {/* ปุ่ม − จำนวน + มุมขวาล่างของการ์ด */}
                      <div role="group" aria-label={`จำนวน ${p.name}`} className="flex items-center rounded-full border border-line bg-bg">
                        <button type="button" disabled={inCart === 0} onClick={() => { setQty(p.id, inCart - 1); }} aria-label={`ลด ${p.name}`} className="inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface-2 disabled:opacity-30"><Minus aria-hidden className="size-4" /></button>
                        <span aria-live="polite" className={`min-w-6 text-center text-sm font-semibold tabular-nums ${inCart ? 'text-lime' : 'text-muted'}`}>{inCart}</span>
                        <button type="button" disabled={soldOut || inCart >= p.stock} onClick={() => { setQty(p.id, inCart + 1); }} aria-label={`เพิ่ม ${p.name}`} className="inline-flex size-10 items-center justify-center rounded-full bg-lime text-bg hover:brightness-110 disabled:bg-surface-2 disabled:text-muted disabled:opacity-60"><Plus aria-hidden className="size-4" /></button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <section aria-label="ตะกร้า" className="flex h-fit flex-col gap-3 rounded-2xl border border-line bg-surface p-4 lg:sticky lg:top-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><ShoppingCart aria-hidden className="size-5" /> ตะกร้า {count > 0 && <span className="text-sm font-normal text-muted">{count} ชิ้น</span>}</h2>
        {lines.length === 0 ? <p className="py-6 text-center text-sm text-muted">กดปุ่ม + ที่สินค้าเพื่อใส่ตะกร้า</p> : (
          <ul className="divide-y divide-line">
            {lines.map(({ product: p, qty }) => (
              <li key={p.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1 text-sm"><b className="block truncate">{p.name}</b><span className="text-muted">{formatBaht(p.priceSatang)} × {qty}</span></div>
                <div className="flex items-center">
                  <button type="button" onClick={() => { setQty(p.id, qty - 1); }} aria-label={`ลด ${p.name}`} className="inline-flex size-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2">{qty === 1 ? <Trash2 aria-hidden className="size-4" /> : <Minus aria-hidden className="size-4" />}</button>
                  <span className="w-6 text-center tabular-nums">{qty}</span>
                  <button type="button" disabled={qty >= p.stock} onClick={() => { setQty(p.id, qty + 1); }} aria-label={`เพิ่ม ${p.name}`} className="inline-flex size-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2 disabled:opacity-40"><Plus aria-hidden className="size-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {discountSatang > 0 && <div className="flex justify-between text-sm text-lime"><span>ส่วนลด{coupon ? ` (${coupon.code})` : ''}</span><b>−{formatBaht(discountSatang)}</b></div>}
        <div className="flex items-baseline justify-between border-t border-line pt-3"><span className="text-muted">ยอดชำระ</span><b className="font-display text-3xl font-semibold">{formatBaht(total)}</b></div>
        <ConfirmForm onSubmitData={submit} confirm={`${buyerMode ? 'ยืนยันซื้อสินค้า' : 'รับเงิน'} ${formatBaht(total)} ด้วย${METHOD_LABEL[method]}? (${String(count)} ชิ้น)`} confirmTitle={buyerMode ? 'ยืนยันการซื้อ' : 'ยืนยันการขาย'} confirmLabel={buyerMode ? 'ยืนยันซื้อ' : 'รับเงินแล้ว'} className="flex flex-col gap-3">
          {lines.length > 0 && (
            <PurchaseCouponField
              key={lines.map(line => `${line.product.id}:${String(line.qty)}`).join('|')}
              purchase={{ target: 'product', items: lines.map(line => ({ productId: line.product.id, qty: line.qty })) }}
              applied={coupon}
              onApplied={setCoupon}
            />
          )}
          <input type="hidden" name="items" value={JSON.stringify(lines.map(l => ({ productId: l.product.id, qty: l.qty })))} />
          {buyerMode && method === 'promptpay' && promptPayReady && (
            <FileDrop
              key={slipResetKey}
              id="slipFile"
              name="slipFile"
              label="แนบรูปสลิปโอนเงิน"
              hint="PNG, JPEG หรือ WebP ขนาดไม่เกิน 10 MB"
              accept="image/png,image/jpeg,image/webp"
              maxBytes={MAX_SLIP_BYTES}
              required
              error={state && !state.ok ? state.fieldErrors?.slipFile : undefined}
              onFileChange={setSlipFile}
            />
          )}
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-1 text-sm font-semibold">วิธีชำระ</legend>
            {METHODS.filter(m => setup.methods.includes(m)).map(m => (
              <label key={m} className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-bg px-2 text-sm has-[:checked]:border-lime has-[:checked]:bg-lime/10 has-[:checked]:font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lime">
                <input type="radio" name="method" value={m} checked={method === m} onChange={() => { setMethod(m); if (m !== 'promptpay') setSlipFile(null); }} className="sr-only" />
                {METHOD_LABEL[m]}
              </label>
            ))}
          </fieldset>
          {method === 'promptpay' && total > 0 && (
            <PromptPayCheckout
              key={promptPayKey}
              payload={setup.promptPayId ? promptPayPayload(setup.promptPayId, total) : undefined}
              qrImageUrl={setup.promptPayQrUrl}
              amountSatang={total}
              note="สแกนหรือโอนยอดนี้ก่อนยืนยันรับชำระ"
              onQrShown={() => { setPromptPayReadyFor(promptPayKey); }}
            />
          )}
          {(method !== 'promptpay' || total <= 0 || promptPayReady) && (
          <button type="submit" disabled={pending || lines.length === 0 || (buyerMode && method === 'promptpay' && total > 0 && !slipFile)} className={`${btn.primary} min-h-14 text-lg`}>
            {pending ? 'กำลังบันทึก…' : method === 'promptpay' && promptPayReady ? `${buyerMode ? 'ยืนยันซื้อ' : 'ยืนยันรับเงิน'} ${formatBaht(total)}` : `${buyerMode ? 'ซื้อสินค้า' : 'ชำระเงิน'} ${formatBaht(total)}`}
          </button>
          )}
          {lines.length > 0 && <button type="button" onClick={() => { setCart({}); setSlipFile(null); setCoupon(null); }} className={btn.ghost}>ล้างตะกร้า</button>}
          <ResultMessage state={state} successTitle={buyerMode ? 'ซื้อสำเร็จ' : 'ขายสำเร็จ'} />
        </ConfirmForm>
      </section>
    </div>
  );
}
