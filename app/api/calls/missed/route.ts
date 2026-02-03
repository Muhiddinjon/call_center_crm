import { NextRequest, NextResponse } from 'next/server';
import {
  getMissedCalls,
  getUnhandledMissedCalls,
  getMissedCallsForOperator,
  markMissedCallAsCallback,
  updateMissedCallStatus,
  removeMissedCall
} from '@/lib/redis';
import { getCurrentUser } from '@/lib/auth';

// GET - Get missed calls
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unhandledOnly = searchParams.get('unhandled') === 'true';
    const myOnly = searchParams.get('my') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    // If requesting operator's own missed calls
    if (myOnly) {
      const session = await getCurrentUser();
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const missedCalls = await getMissedCallsForOperator(session.userId);
      return NextResponse.json({
        missedCalls,
        count: missedCalls.length,
      });
    }

    const missedCalls = unhandledOnly
      ? await getUnhandledMissedCalls()
      : await getMissedCalls(limit);

    return NextResponse.json({
      missedCalls,
      count: missedCalls.length,
    });
  } catch (error) {
    console.error('Get missed calls error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - Mark as callback, resolve, or remove
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { callId, action } = body;

    if (!callId || !action) {
      return NextResponse.json(
        { error: 'callId and action are required' },
        { status: 400 }
      );
    }

    const operatorName = session.fullName || session.username;

    if (action === 'callback') {
      await markMissedCallAsCallback(callId, operatorName);
      return NextResponse.json({ success: true, message: 'Marked as callback' });
    } else if (action === 'resolve') {
      const updated = await updateMissedCallStatus(callId, 'resolved', operatorName);
      return NextResponse.json({ success: true, message: 'Marked as resolved', missedCall: updated });
    } else if (action === 'remove') {
      await removeMissedCall(callId);
      return NextResponse.json({ success: true, message: 'Removed from missed calls' });
    }

    return NextResponse.json({ error: 'Invalid action. Use: callback, resolve, or remove' }, { status: 400 });
  } catch (error) {
    console.error('Update missed call error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
