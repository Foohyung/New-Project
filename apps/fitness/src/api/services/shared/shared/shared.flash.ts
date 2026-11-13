// popup "ลบสำเร็จ" หลัง server redirect — ชื่อสิ่งที่ลบส่งผ่าน cookie อายุสั้น ไม่ใส่ใน URL (ข้อมูลส่วนบุคคล · PDPA)
// URL มีแค่ ?deleted=1 ให้ <DeletedFlash /> รู้ว่าต้องแสดง popup แล้วอ่านชื่อจาก cookie นี้

export const DELETED_FLASH_COOKIE = 'ff-deleted';
export const DELETED_FLASH_MAX_AGE = 60;
