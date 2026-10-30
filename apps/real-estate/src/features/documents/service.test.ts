import { describe, expect, it } from 'vitest';
import { checkUpload, expiryState, formatSize, MAX_UPLOAD_BYTES, safeFileName, sniffMime } from './service';

const bytes = (...b: number[]) => new Uint8Array([...b, 0, 0, 0, 0, 0, 0, 0, 0]);

describe('ตรวจไฟล์อัปโหลด', () => {
  it('รู้ชนิดไฟล์จาก magic bytes', () => {
    expect(sniffMime(new TextEncoder().encode('%PDF-1.7\n'))).toBe('application/pdf');
    expect(sniffMime(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(sniffMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
    expect(sniffMime(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]))).toBe('image/webp');
  });
  it('ปฏิเสธไฟล์ที่เปลี่ยนนามสกุลมา เช่น HTML/สคริปต์', () => {
    expect(checkUpload(new TextEncoder().encode('<script>alert(1)</script>'))).toEqual({ ok: false, reason: 'type' });
  });
  it('ปฏิเสธไฟล์ว่างและไฟล์ใหญ่เกิน 10 MB', () => {
    expect(checkUpload(new Uint8Array())).toEqual({ ok: false, reason: 'empty' });
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    big.set([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(checkUpload(big)).toEqual({ ok: false, reason: 'too-large' });
  });
  it('ตั้งชื่อไฟล์ใหม่ให้ปลอดภัยและใช้นามสกุลตามชนิดจริง', () => {
    expect(safeFileName('../../etc/โฉนด:45871.exe', 'application/pdf')).toBe('.. .. etc โฉนด 45871.pdf');
    expect(safeFileName('', 'image/png')).toBe('เอกสาร.png');
  });
});

describe('วันหมดอายุ', () => {
  it('แยกหมดแล้ว / ใกล้หมดใน 30 วัน / ยังไม่หมด', () => {
    expect(expiryState(null, '2026-10-24')).toBe('none');
    expect(expiryState('2026-10-23', '2026-10-24')).toBe('expired');
    expect(expiryState('2026-11-23', '2026-10-24')).toBe('soon');
    expect(expiryState('2026-11-24', '2026-10-24')).toBe('ok');
  });
  it('แสดงขนาดไฟล์', () => {
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(2048)).toBe('2 KB');
    expect(formatSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });
});
