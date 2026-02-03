import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { lookupByPhone } from '@/lib/driver-lookup';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone } = await params;
    const decodedPhone = decodeURIComponent(phone);

    const result = await lookupByPhone(decodedPhone);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Lookup error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
