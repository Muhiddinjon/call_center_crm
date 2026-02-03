import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getActiveCalls, queryCalls } from '@/lib/redis';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active calls
    let calls = await getActiveCalls();

    // If no active calls, get recent calls from last 5 minutes
    if (calls.length === 0) {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      calls = await queryCalls({
        dateFrom: fiveMinutesAgo,
        limit: 20,
      });
    }

    return NextResponse.json(calls);
  } catch (error) {
    console.error('Get active calls error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
