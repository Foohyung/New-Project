'use client';

import { useEffect } from 'react';

type InlineStyle = { value: string; priority: string };
type ScrollLockSnapshot = {
  scrollY: number;
  html: Record<string, InlineStyle>;
  body: Record<string, InlineStyle>;
};

const HTML_PROPERTIES = ['overflow', 'overscroll-behavior'];
const BODY_PROPERTIES = ['position', 'top', 'left', 'right', 'width', 'overflow', 'padding-right'];
let lockCount = 0;
let snapshot: ScrollLockSnapshot | null = null;

function readStyles(style: CSSStyleDeclaration, properties: string[]): Record<string, InlineStyle> {
  return Object.fromEntries(properties.map(property => [
    property,
    { value: style.getPropertyValue(property), priority: style.getPropertyPriority(property) },
  ]));
}

function restoreStyles(style: CSSStyleDeclaration, saved: Record<string, InlineStyle>): void {
  for (const [property, value] of Object.entries(saved)) {
    if (value.value) style.setProperty(property, value.value, value.priority);
    else style.removeProperty(property);
  }
}

function lockBodyScroll(): () => void {
  if (lockCount === 0) {
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    const bodyPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    snapshot = {
      scrollY,
      html: readStyles(html.style, HTML_PROPERTIES),
      body: readStyles(body.style, BODY_PROPERTIES),
    };

    html.style.setProperty('overflow', 'hidden');
    html.style.setProperty('overscroll-behavior', 'none');
    body.style.setProperty('position', 'fixed');
    body.style.setProperty('top', `-${String(scrollY)}px`);
    body.style.setProperty('left', '0');
    body.style.setProperty('right', '0');
    body.style.setProperty('width', '100%');
    body.style.setProperty('overflow', 'hidden');
    if (scrollbarWidth > 0) body.style.setProperty('padding-right', `${String(bodyPaddingRight + scrollbarWidth)}px`);
  }

  lockCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount -= 1;
    if (lockCount > 0 || !snapshot) return;

    const saved = snapshot;
    snapshot = null;
    restoreStyles(document.documentElement.style, saved.html);
    restoreStyles(document.body.style, saved.body);
    window.scrollTo(0, saved.scrollY);
  };
}

/** ล็อกการเลื่อนพื้นหลังขณะมี popup; รองรับ popup ซ้อนกัน */
export function useBodyScrollLock(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    return lockBodyScroll();
  }, [open]);
}
