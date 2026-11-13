-- ข้อมูลผู้ขายบนหัวใบเสร็จ/ใบกำกับภาษีอย่างย่อ และรูปแบบเลขที่ใบเสร็จ แยกตามสาขา (หน้า /payment-settings)
-- ว่าง = ใช้ค่าเดิม: ชื่อยิม → ที่อยู่/เบอร์ของสาขา (branches) → SHOP_* ใน .env
ALTER TABLE `branch_branding`
  ADD COLUMN `receipt_brand` VARCHAR(60) NULL,
  ADD COLUMN `receipt_legal_name` VARCHAR(200) NULL,
  ADD COLUMN `receipt_address` VARCHAR(500) NULL,
  ADD COLUMN `receipt_tax_id` VARCHAR(20) NULL,
  ADD COLUMN `receipt_phone` VARCHAR(30) NULL,
  -- รูปแบบเลขที่ใบเสร็จของสาขา เช่น BKK-{YY}{MM}-{####} · ว่าง = RC-{YY}{MM}-{####} (รูปแบบเดิม)
  ADD COLUMN `receipt_number_format` VARCHAR(60) NULL;
