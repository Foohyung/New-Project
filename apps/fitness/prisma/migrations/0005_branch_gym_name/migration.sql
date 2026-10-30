-- เพิ่มชื่อ Gym ที่เจ้าของกำหนดให้เป็นชื่อหลักของแบรนด์สาขา
ALTER TABLE `branch_branding`
  ADD COLUMN `gym_name` VARCHAR(120) NULL AFTER `branch`;
