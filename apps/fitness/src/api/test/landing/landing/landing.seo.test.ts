import { describe, expect, it } from 'vitest';
import { FAQ, jsonLdString, landingJsonLd, llmsTxt, PRIVATE_PATHS, siteUrl } from '@/api/services/landing/landing/landing.seo';
import { BUYOUT_PRICE, RENT_PRICE } from '@/api/services/landing/landing/landing.service';

describe('siteUrl', () => {
  it('ใช้ origin ของ APP_URL (ตัด path และ / ท้าย)', () => {
    expect(siteUrl('https://fitflows.site/')).toBe('https://fitflows.site');
    expect(siteUrl('  https://gym.example.com/app  ')).toBe('https://gym.example.com');
  });
  it('ไม่ตั้ง / ไม่ถูกต้อง / ไม่ใช่ http(s) → fitflows.site', () => {
    expect(siteUrl('')).toBe('https://fitflows.site');
    expect(siteUrl('not a url')).toBe('https://fitflows.site');
    expect(siteUrl('javascript:alert(1)')).toBe('https://fitflows.site');
  });
});

describe('landingJsonLd', () => {
  const graph = landingJsonLd('https://fitflows.site')['@graph'] as { '@type': string; [k: string]: unknown }[];
  const byType = (t: string) => graph.find(n => n['@type'] === t);

  it('มี Organization, WebSite, SoftwareApplication และ FAQPage', () => {
    expect(graph.map(n => n['@type'])).toEqual(['Organization', 'WebSite', 'SoftwareApplication', 'FAQPage']);
  });
  it('ราคาตรงกับการ์ดราคาบนหน้าแรก', () => {
    const offers = byType('SoftwareApplication')?.offers as { price: number; priceCurrency: string }[];
    expect(offers.map(o => o.price)).toEqual([RENT_PRICE.month.amount, RENT_PRICE.year.amount, BUYOUT_PRICE.amount]);
    expect(offers.every(o => o.priceCurrency === 'THB')).toBe(true);
  });
  it('FAQPage มีทุกคำถามที่แสดงบนหน้า', () => {
    const qs = byType('FAQPage')?.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
    expect(qs.map(q => q.name)).toEqual(FAQ.map(f => f.q));
    expect(qs.every(q => q.acceptedAnswer.text.length > 20)).toBe(true);
  });
});

describe('jsonLdString', () => {
  it('กัน </script> ปิดแท็กก่อนเวลา', () => {
    const out = jsonLdString({ x: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(JSON.parse(out)).toEqual({ x: '</script><script>alert(1)</script>' });
  });
});

describe('llmsTxt', () => {
  it('เป็น Markdown ที่มีชื่อ ราคา คำถาม และลิงก์ตามโดเมน', () => {
    const text = llmsTxt('https://gym.example.com');
    expect(text.startsWith('# FitFlow\n')).toBe(true);
    expect(text).toContain(BUYOUT_PRICE.amount.toLocaleString('en-US'));
    for (const f of FAQ) expect(text).toContain(`### ${f.q}`);
    expect(text).toContain('(https://gym.example.com/#pricing)');
  });
});

describe('PRIVATE_PATHS', () => {
  it('ไม่ปิดหน้าแรกและหน้า login', () => {
    expect(PRIVATE_PATHS).not.toContain('/');
    expect(PRIVATE_PATHS).not.toContain('/login');
    expect(PRIVATE_PATHS).toContain('/me');
  });
});
