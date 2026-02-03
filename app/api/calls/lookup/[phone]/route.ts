import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { lookupByPhone } from '@/lib/driver-lookup';
import { searchCallsByPhone } from '@/lib/redis';

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

    // Run both lookups in parallel for better performance
    const [externalResult, localHistory] = await Promise.all([
      lookupByPhone(decodedPhone),
      searchCallsByPhone(decodedPhone),
    ]);

    // Combine results - external API takes priority, local DB as fallback
    return NextResponse.json({
      ...externalResult,
      callHistory: localHistory,
    });
  } catch (error) {
    console.error('Lookup error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
