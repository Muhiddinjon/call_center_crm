import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { redis, KEYS } from '@/lib/redis';

// GET - Debug: View recent events in Redis stream
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    // Get last 20 events from stream
    const events = await redis.xrange(KEYS.eventsStream, '-', '+', 20);

    // Get stream info
    const streamInfo = await redis.xlen(KEYS.eventsStream);

    return NextResponse.json({
      totalEvents: streamInfo,
      recentEvents: events,
      streamKey: KEYS.eventsStream,
    });
  } catch (error) {
    console.error('Debug events error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST - Debug: Manually publish a test event
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const testEvent = {
      type: 'incoming_call',
      data: JSON.stringify({
        id: 'test-' + Date.now(),
        callId: 'test-call-' + Date.now(),
        phoneNumber: '998901234567',
        callType: 'incoming',
        isDriver: false,
        callStart: Date.now(),
      }),
      timestamp: Date.now().toString(),
    };

    const eventId = await redis.xadd(KEYS.eventsStream, '*', testEvent);

    return NextResponse.json({
      success: true,
      eventId,
      event: testEvent,
    });
  } catch (error) {
    console.error('Debug publish error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
