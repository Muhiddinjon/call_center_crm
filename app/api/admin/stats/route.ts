import { NextRequest, NextResponse } from 'next/server';
import { getOperatorStats, getDailyStats, getCallStats } from '@/lib/redis';
import { getDashboardStats as getBinotelStats } from '@/lib/binotel';
import { getTashkentDateString, getTashkentStartOfDay, getTashkentEndOfDay } from '@/lib/utils';

// GET - Get various statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily';
    const dateFrom = searchParams.get('dateFrom'); // Expected format: YYYY-MM-DD
    const dateTo = searchParams.get('dateTo'); // Expected format: YYYY-MM-DD
    const operatorName = searchParams.get('operator');

    // Build filters using Tashkent timezone
    const filters: {
      dateFrom?: number;
      dateTo?: number;
      operatorName?: string;
    } = {};

    if (dateFrom) {
      // Use Tashkent timezone for date parsing
      filters.dateFrom = getTashkentStartOfDay(dateFrom);
    } else {
      // Default to today in Tashkent
      filters.dateFrom = getTashkentStartOfDay();
    }

    if (dateTo) {
      filters.dateTo = getTashkentEndOfDay(dateTo);
    } else {
      // Default to end of today in Tashkent
      filters.dateTo = getTashkentEndOfDay();
    }

    if (operatorName) {
      filters.operatorName = operatorName;
    }

    if (type === 'operators') {
      const stats = await getOperatorStats(filters);
      return NextResponse.json(stats);
    }

    if (type === 'daily') {
      // Pass date string in YYYY-MM-DD format
      const stats = await getDailyStats(dateFrom || getTashkentDateString());

      // If local stats seem incomplete (no answered/missed but has calls),
      // try to get Binotel stats as fallback
      if (stats.totalCalls > 0 && stats.answeredCalls === 0 && stats.missedCalls === 0) {
        try {
          const binotelStats = await getBinotelStats();
          // Use Binotel data if available
          return NextResponse.json({
            ...stats,
            answeredCalls: binotelStats.todayAnswered,
            missedCalls: binotelStats.todayMissed,
            avgDuration: binotelStats.avgDuration,
            // Mark that this data came from Binotel
            source: 'binotel',
            localTotal: stats.totalCalls,
            binotelTotal: binotelStats.todayIncoming,
          });
        } catch (e) {
          console.warn('Could not fetch Binotel stats as fallback:', e);
        }
      }

      return NextResponse.json(stats);
    }

    if (type === 'general') {
      const stats = await getCallStats(filters);
      return NextResponse.json(stats);
    }

    // Return all stats
    const [operatorStats, dailyStats, generalStats] = await Promise.all([
      getOperatorStats(filters),
      getDailyStats(dateFrom || getTashkentDateString()),
      getCallStats(filters),
    ]);

    // If daily stats seem incomplete, try Binotel fallback
    let daily = dailyStats;
    if (dailyStats.totalCalls > 0 && dailyStats.answeredCalls === 0 && dailyStats.missedCalls === 0) {
      try {
        const binotelStats = await getBinotelStats();
        daily = {
          ...dailyStats,
          answeredCalls: binotelStats.todayAnswered,
          missedCalls: binotelStats.todayMissed,
          avgDuration: binotelStats.avgDuration,
        };
      } catch (e) {
        console.warn('Could not fetch Binotel stats as fallback:', e);
      }
    }

    return NextResponse.json({
      operators: operatorStats,
      daily,
      general: generalStats,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
