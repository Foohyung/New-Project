import { NextResponse } from 'next/server';
import { getSaleSlip } from '@/api/dal/sales/sales/sales.dal';
import { ForbiddenError } from '@/api/lib/auth/auth/auth.rbac';
import { getSession } from '@/api/lib/auth/auth/auth.session';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return new NextResponse(null, { status: 401 });
  try {
    const slip = await getSaleSlip(session, (await params).id);
    if (!slip) return new NextResponse(null, { status: 404 });
    return new NextResponse(Buffer.from(slip.data, 'base64'), {
      headers: {
        'Content-Type': slip.contentType,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return new NextResponse(null, { status: 403 });
    throw error;
  }
}
