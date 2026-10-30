import { NextResponse } from 'next/server';
import { getBranchLogo } from '@/api/dal/branding/branding/branding.dal';
import { getSession } from '@/api/lib/auth/auth/auth.session';

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return new NextResponse(null, { status: 401 });
  const logo = await getBranchLogo(session);
  if (!logo) return new NextResponse(null, { status: 404 });
  return new NextResponse(Buffer.from(logo.data, 'base64'), {
    headers: {
      'Content-Type': logo.contentType,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
