export function buildCsp(options: { nonce: string; dev?: boolean; imgSrc?: string[] }): string;
export function securityHeaders(options?: { permissions?: Record<string, string> }): { key: string; value: string }[];
export function createNonce(): string;
