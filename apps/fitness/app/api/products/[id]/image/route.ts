import { NextResponse } from 'next/server';
import { getProductImage } from '@/api/dal/sales/sales/sales.dal';
import { getSession } from '@/api/lib/auth/auth/auth.session';

/** รูปสินค้า — URL มี ?v=<เวลาแก้ไข> จึง cache ในเบราว์เซอร์ได้ (เปลี่ยนรูปแล้ว URL เปลี่ยนตาม) */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return new NextResponse(null, { status: 401 });
  try {
    const image = await getProductImage(session, (await params).id);
    if (!image) return new NextResponse(null, { status: 404 });
    return new NextResponse(Buffer.from(image.data, 'base64'), {
      headers: { 'Content-Type': image.contentType, 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    return new NextResponse(null, { status: 403 });
  }
}
