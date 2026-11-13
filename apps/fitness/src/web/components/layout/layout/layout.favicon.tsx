'use client';

import { useEffect } from 'react';

/** ไอคอนแท็บสีตามสีหลักปัจจุบัน (--color-lime ซึ่งเปลี่ยนตามธีม/โหมด หรือสีแบรนด์สาขา) */
function updateFavicon(): void {
  const style = getComputedStyle(document.documentElement);
  const accent = style.getPropertyValue('--color-lime').trim();
  const foreground = style.getPropertyValue('--color-bg').trim();
  if (!accent) return;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${accent}"/><path d="M8 35h11l4-9 6 19 7-27 4 17h16" fill="none" stroke="${foreground}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  const links = document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]');
  if (links.length) {
    links.forEach(link => {
      if (link.href !== href) link.href = href;
    });
  } else {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = href;
    document.head.append(link);
  }
}

/**
 * วางครั้งเดียวใน root layout (ทุกหน้า รวมหน้า login) — อัปเดตไอคอนตอนโหลด
 * และทุกครั้งที่ธีม/โหมด/สีแบรนด์บน <html> เปลี่ยน · เฝ้า <head> ด้วยเพราะ Next อาจใส่ link ไอคอนเดิมกลับตอนเปลี่ยนหน้า
 */
export function FaviconSync() {
  useEffect(() => {
    updateFavicon();
    const root = new MutationObserver(updateFavicon);
    root.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode', 'style'] });
    const head = new MutationObserver(updateFavicon);
    head.observe(document.head, { childList: true });
    return () => {
      root.disconnect();
      head.disconnect();
    };
  }, []);
  return null;
}
