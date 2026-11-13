import type { PaymentMethod } from '@/api/services/payments/payments/payments.service';

export type ProductDto = {
  id: string;
  name: string;
  category: string;
  priceSatang: number;
  stock: number;
  lowStock: number;
  active: boolean;
  /** URL รูปสินค้า (มี ?v= ตามเวลาแก้ไข ให้เบราว์เซอร์ cache ได้) · null = ไม่มีรูป */
  imageUrl: string | null;
  /** เคยขายแล้ว — ลบไม่ได้ */
  sold: boolean;
  updatedAt: string;
  updatedByName: string | null;
};

export type ProductBranchSummaryDto = {
  branch: string;
  active: boolean;
  productCount: number;
  activeCount: number;
};

export type SaleDto = {
  id: string;
  receiptNo: string;
  method: PaymentMethod;
  totalSatang: number;
  listPriceSatang: number;
  discountSatang: number;
  couponCode: string | null;
  hasSlip: boolean;
  createdAt: string;
  soldBy: string | null;
  voidedAt: string | null;
  voidedByName: string | null;
  items: { name: string; priceSatang: number; qty: number }[];
};
