import { NextRequest, NextResponse } from 'next/server';
import { getOperatorStats, getDailyStats, getCallStats } from '@/lib/redis';

// GET - Get various statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const operatorName = searchParams.get('operator');

    // Build filters
    const filters: {
      dateFrom?: number;
      dateTo?: number;
      operatorName?: string;
    } = {};

    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom).getTime();
    } else {
      // Default to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filters.dateFrom = today.getTime();
    }

    if (dateTo) {
      filters.dateTo = new Date(dateTo).getTime();
    } else {
      // Default to end of today
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      filters.dateTo = endOfDay.getTime();
    }

    if (operatorName) {
      filters.operatorName = operatorName;
    }

    if (type === 'operators') {
      const stats = await getOperatorStats(filters);
      return NextResponse.json(stats);
    }

    if (type === 'daily') {
      const stats = await getDailyStats(dateFrom ? new Date(dateFrom) : undefined);
      return NextResponse.json(stats);
    }

    if (type === 'general') {
      const stats = await getCallStats(filters);
      return NextResponse.json(stats);
    }

    // Return all stats
    const [operatorStats, dailyStats, generalStats] = await Promise.all([
      getOperatorStats(filters),
      getDailyStats(dateFrom ? new Date(dateFrom) : undefined),
      getCallStats(filters),
    ]);

    return NextResponse.json({
      operators: operatorStats,
      daily: dailyStats,
      general: generalStats,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
