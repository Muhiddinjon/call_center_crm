import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getRecentEvents } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Polling endpoint - returns events since lastEventId
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const lastEventId = searchParams.get('lastEventId') || '0';

  try {
    const events = await getRecentEvents(lastEventId);

    return NextResponse.json({
      events,
      lastEventId: events.length > 0 ? events[events.length - 1].id : lastEventId,
    });
  } catch (error) {
    console.error('Poll events error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
