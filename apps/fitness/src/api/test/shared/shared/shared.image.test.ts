import { describe, expect, it } from 'vitest';
import { detectedImageType, readImageUpload } from '@/api/services/shared/shared/shared.image';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

describe('ตรวจไฟล์รูป', () => {
  it('ดูชนิดจาก magic bytes', () => {
    expect(detectedImageType(PNG)).toBe('image/png');
    expect(detectedImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectedImageType(new TextEncoder().encode('<svg></svg>'))).toBeNull();
  });

  it('อ่านไฟล์จากฟอร์ม: ไม่มีไฟล์ = null · ผิดชนิดหรือใหญ่เกิน = error', async () => {
    expect(await readImageUpload(null, 1024)).toBeNull();
    expect(await readImageUpload(new File([PNG], 'a.png', { type: 'image/png' }), 1024)).toEqual({ data: Buffer.from(PNG).toString('base64'), contentType: 'image/png' });
    expect(await readImageUpload(new File([PNG], 'a.jpg', { type: 'image/jpeg' }), 1024)).toHaveProperty('error');
    expect(await readImageUpload(new File([PNG], 'a.png', { type: 'image/png' }), 4)).toHaveProperty('error');
  });
});
