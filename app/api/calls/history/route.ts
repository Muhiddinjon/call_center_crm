import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { searchCallsByPhone } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    const result = await searchCallsByPhone(phone);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Call history error:', error);
    return NextResponse.json(
      { error: 'Internal error', details: String(error) },
      { status: 500 }
    );
  }
}
