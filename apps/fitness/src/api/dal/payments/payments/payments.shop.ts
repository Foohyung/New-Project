import 'server-only';
import type { Session } from '@/api/lib/auth/auth/auth.session';
import { authorize } from '@/api/lib/auth/auth/auth.rbac';
import { prisma } from '@/api/lib/db/db/db';
import type { PaymentSetup, ReceiptIssuer, ShopProfile } from '@/api/types/payments/payments/payments.types';
import { paymentSettingsBranch } from '@/api/dal/payments/payments/payments.dal';
import { receiptNumbers } from '@/api/dal/payments/payments/payments.receipt-no';
import { DEFAULT_RECEIPT_FORMAT } from '@/api/services/payments/payments/payments.service';
import { isSafeLogoUrl } from '@/api/services/branding/branding/branding.service';

const RECEIPT_SELECT = { receiptNumberFormat: true, gymName: true, receiptBrand: true, receiptLegalName: true, receiptAddress: true, receiptTaxId: true, receiptPhone: true } as const;

/** ค่าที่ใช้เมื่อสาขายังไม่ได้กรอก: ชื่อยิม → ที่อยู่/เบอร์ของสาขา → SHOP_* ใน .env */
async function receiptDefaults(branch: string, gymName: string | null | undefined): Promise<ReceiptIssuer> {
  const row = await prisma().branch.findUnique({ where: { name: branch }, select: { address: true, phone: true } });
  return {
    brand: gymName?.trim() || 'FITFLOW',
    legalName: process.env.SHOP_LEGAL_NAME ?? 'บริษัท ฟิตโฟลว์ จำกัด (ตัวอย่าง)',
    address: row?.address?.trim() || (process.env.SHOP_ADDRESS ?? '123 ถ.พหลโยธิน แขวงสามเสนใน เขตพญาไท กรุงเทพฯ 10400'),
    taxId: process.env.SHOP_TAX_ID ?? '0-1055-XXXXX-XX-X',
    phone: row?.phone?.trim() || (process.env.SHOP_PHONE ?? '02-123-4567'),
  };
}

async function receiptIssuer(branch: string): Promise<{ issuer: ReceiptIssuer; saved: Partial<ReceiptIssuer>; defaults: ReceiptIssuer; numberFormat: string | null }> {
  const row = await prisma().branchBranding.findUnique({ where: { branch }, select: RECEIPT_SELECT });
  const defaults = await receiptDefaults(branch, row?.gymName);
  const saved: Partial<ReceiptIssuer> = {
    brand: row?.receiptBrand ?? undefined,
    legalName: row?.receiptLegalName ?? undefined,
    address: row?.receiptAddress ?? undefined,
    taxId: row?.receiptTaxId ?? undefined,
    phone: row?.receiptPhone ?? undefined,
  };
  return { issuer: { ...defaults, ...Object.fromEntries(Object.entries(saved).filter(([, v]) => v)) }, saved, defaults, numberFormat: row?.receiptNumberFormat ?? null };
}

/** ข้อมูลผู้ขายที่ต้องพิมพ์บนใบเสร็จของสาขา */
export async function shopProfile(branch: string, setup: PaymentSetup): Promise<ShopProfile> {
  const [{ issuer }, branding] = await Promise.all([
    receiptIssuer(branch),
    prisma().branchBranding.findUnique({
      where: { branch },
      select: { logoData: true, logoContentType: true, logoUrl: true },
    }),
  ]);
  const logoSrc = branding?.logoData && branding.logoContentType
    ? `data:${branding.logoContentType};base64,${branding.logoData}`
    : branding?.logoUrl && isSafeLogoUrl(branding.logoUrl)
      ? branding.logoUrl
      : null;
  return { ...issuer, branch, logoSrc, promptPayId: setup.promptPayId, promptPayQrUrl: setup.promptPayQrUrl };
}

/** ค่าในหน้าตั้งค่า: ที่กรอกไว้ของสาขา + ค่าที่จะใช้ถ้าเว้นว่าง · admin ทุกสาขา / owner เฉพาะสาขาที่ดูแล */
export async function getReceiptSettings(session: Session, requestedBranch: string): Promise<{ saved: Partial<ReceiptIssuer>; defaults: ReceiptIssuer; numberFormat: string | null; defaultNumberFormat: string; lastNumber: string | null; nextNumber: string }> {
  await authorize(session, 'payments.configure');
  const branch = await paymentSettingsBranch(session, requestedBranch);
  const { saved, defaults, numberFormat } = await receiptIssuer(branch);
  const numbers = await receiptNumbers(prisma(), numberFormat ?? DEFAULT_RECEIPT_FORMAT);
  return { saved, defaults, numberFormat, defaultNumberFormat: DEFAULT_RECEIPT_FORMAT, lastNumber: numbers.last, nextNumber: numbers.next };
}

/** บันทึกหัวใบเสร็จของสาขา — ช่องว่างเก็บเป็น NULL (กลับไปใช้ค่าเริ่มต้น) */
export async function saveReceiptSettings(session: Session, input: { branch: string; numberFormat: string } & ReceiptIssuer): Promise<string> {
  await authorize(session, 'payments.configure');
  const branch = await paymentSettingsBranch(session, input.branch);
  // รูปแบบเลขที่ใบเสร็จห้ามซ้ำกับสาขาอื่น — แต่ละสาขาได้ชุดเลขของตัวเอง
  const numberFormat = input.numberFormat && input.numberFormat !== DEFAULT_RECEIPT_FORMAT ? input.numberFormat : null;
  if (numberFormat) {
    const other = await prisma().branchBranding.findFirst({ where: { receiptNumberFormat: numberFormat, branch: { not: branch } }, select: { branch: true } });
    if (other) throw new Error(`RECEIPT_FORMAT_TAKEN:${other.branch}`);
  }
  const data = {
    receiptNumberFormat: numberFormat,
    receiptBrand: input.brand || null,
    receiptLegalName: input.legalName || null,
    receiptAddress: input.address || null,
    receiptTaxId: input.taxId || null,
    receiptPhone: input.phone || null,
    updatedById: session.userId,
    updatedByName: session.name,
  };
  await prisma().branchBranding.upsert({
    where: { branch },
    create: { branch, ...data, createdById: session.userId, createdByName: session.name },
    update: data,
  });
  return branch;
}
