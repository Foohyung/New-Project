export const DEFAULT_BRAND_COLOR = '#c6ff3d';

export function isSafeLogoUrl(value: string): boolean {
  if (!value) return true;
  try {
    if (value.startsWith('//')) return false;
    if (value.startsWith('/')) {
      if (value.includes('\\')) return false;
      const path = value.split(/[?#]/, 1)[0] ?? '';
      for (const segment of path.split('/')) {
        let decoded = segment;
        for (let i = 0; i < 2; i++) decoded = decodeURIComponent(decoded);
        if (decoded === '.' || decoded === '..') return false;
      }
    }
    const url = new URL(value, 'https://fitflow.invalid');
    if (url.origin === 'https://fitflow.invalid') {
      return value.startsWith('/');
    }
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}
