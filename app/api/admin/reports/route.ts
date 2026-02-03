import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { queryCalls, getCallStats } from '@/lib/redis';
import type { CallFilters } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    const filters: CallFilters = {
      limit: parseInt(searchParams.get('limit') || '100'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    if (searchParams.get('dateFrom')) {
      filters.dateFrom = new Date(searchParams.get('dateFrom')!).getTime();
    }
    if (searchParams.get('dateTo')) {
      // Add end of day for dateTo
      const dateTo = new Date(searchParams.get('dateTo')!);
      dateTo.setHours(23, 59, 59, 999);
      filters.dateTo = dateTo.getTime();
    }
    if (searchParams.get('region')) {
      filters.region = searchParams.get('region')!;
    }
    if (searchParams.get('callType')) {
      filters.callType = searchParams.get('callType') as 'incoming' | 'outgoing';
    }
    if (searchParams.get('callerType')) {
      filters.callerType = searchParams.get('callerType') as 'driver' | 'client';
    }
    if (searchParams.get('driverId')) {
      filters.driverId = searchParams.get('driverId')!;
    }
    if (searchParams.get('operatorName')) {
      filters.operatorName = searchParams.get('operatorName')!;
    }
    if (searchParams.get('phoneNumber')) {
      filters.phoneNumber = searchParams.get('phoneNumber')!;
    }

    // Get calls and stats
    const [calls, stats] = await Promise.all([
      queryCalls(filters),
      getCallStats(filters),
    ]);

    return NextResponse.json({ calls, stats });
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
