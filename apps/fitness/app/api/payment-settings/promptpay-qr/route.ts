import { NextResponse } from 'next/server';
import { getPromptPayQr } from '@/api/dal/payments/payments/payments.dal';
import { getSession } from '@/api/lib/auth/auth/auth.session';
import { ForbiddenError } from '@/api/lib/auth/auth/auth.rbac';

export async function GET(request: Request): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return new NextResponse(null, { status: 401 });
  const requestedBranch = new URL(request.url).searchParams.get('branch') ?? undefined;
  let qr: Awaited<ReturnType<typeof getPromptPayQr>>;
  try {
    qr = await getPromptPayQr(session, requestedBranch);
  } catch (error) {
    if (error instanceof ForbiddenError) return new NextResponse(null, { status: 403 });
    throw error;
  }
  if (!qr) return new NextResponse(null, { status: 404 });
  return new NextResponse(Buffer.from(qr.data, 'base64'), {
    headers: {
      'Content-Type': qr.contentType,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
