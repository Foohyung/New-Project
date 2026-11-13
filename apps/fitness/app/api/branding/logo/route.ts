import { NextResponse } from 'next/server';
import { getBranchLogo } from '@/api/dal/branding/branding/branding.dal';
import { ForbiddenError } from '@/api/lib/auth/auth/auth.rbac';
import { getSession } from '@/api/lib/auth/auth/auth.session';

export async function GET(request: Request): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return new NextResponse(null, { status: 401 });
  const requestedBranch = new URL(request.url).searchParams.get('branch') ?? session.branch;
  let logo: Awaited<ReturnType<typeof getBranchLogo>>;
  try {
    logo = await getBranchLogo(session, requestedBranch);
  } catch (error) {
    if (error instanceof ForbiddenError) return new NextResponse(null, { status: 403 });
    throw error;
  }
  if (!logo) return new NextResponse(null, { status: 404 });
  return new NextResponse(Buffer.from(logo.data, 'base64'), {
    headers: {
      'Content-Type': logo.contentType,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
