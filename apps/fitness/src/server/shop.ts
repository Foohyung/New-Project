import 'server-only';
import type { ShopProfile } from '@/features/payments/types';
import { shopPromptPayId } from './dal/payments';

/** ข้อมูลผู้ขายที่ต้องพิมพ์บนใบเสร็จ — production ตั้งค่าผ่าน env */
export function shopProfile(branch: string): ShopProfile {
  return {
    brand: 'FITFLOW',
    legalName: process.env.SHOP_LEGAL_NAME ?? 'บริษัท ฟิตโฟลว์ จำกัด (ตัวอย่าง)',
    branch,
    address: process.env.SHOP_ADDRESS ?? '123 ถ.พหลโยธิน แขวงสามเสนใน เขตพญาไท กรุงเทพฯ 10400',
    taxId: process.env.SHOP_TAX_ID ?? '0-1055-XXXXX-XX-X',
    phone: process.env.SHOP_PHONE ?? '02-123-4567',
    promptPayId: shopPromptPayId(),
  };
}
