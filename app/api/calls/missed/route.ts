import { NextRequest, NextResponse } from 'next/server';
import { getMissedCalls, getUnhandledMissedCalls, markMissedCallAsCallback, removeMissedCall } from '@/lib/redis';

// GET - Get missed calls
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unhandledOnly = searchParams.get('unhandled') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const missedCalls = unhandledOnly
      ? await getUnhandledMissedCalls()
      : await getMissedCalls(limit);

    return NextResponse.json(missedCalls);
  } catch (error) {
    console.error('Get missed calls error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - Mark as callback or remove
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callId, action, operatorName } = body;

    if (!callId || !action) {
      return NextResponse.json(
        { error: 'callId and action are required' },
        { status: 400 }
      );
    }

    if (action === 'callback') {
      await markMissedCallAsCallback(callId, operatorName || 'Unknown');
      return NextResponse.json({ success: true, message: 'Marked as callback' });
    } else if (action === 'remove') {
      await removeMissedCall(callId);
      return NextResponse.json({ success: true, message: 'Removed from missed calls' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Update missed call error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
