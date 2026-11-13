import { llmsTxt, siteUrl } from '@/api/services/landing/landing/landing.seo';

/** /llms.txt — สรุปเว็บให้ AI อ่าน (GEO) */
export function GET(): Response {
  return new Response(llmsTxt(siteUrl()), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
