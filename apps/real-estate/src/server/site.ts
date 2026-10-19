import 'server-only';

/** URL หลักของเว็บ (ใช้กับ canonical, sitemap, Open Graph) — ตั้งค่า SITE_URL ใน production */
export function siteUrl(): string {
  return process.env.SITE_URL ?? 'http://localhost:3003';
}
