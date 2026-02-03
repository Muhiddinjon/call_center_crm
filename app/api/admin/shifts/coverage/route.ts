import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getShiftCoverage } from '@/lib/redis';

// GET - Get shift coverage for a specific date
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'date parametri YYYY-MM-DD formatida bo\'lishi kerak' },
        { status: 400 }
      );
    }

    const coverage = await getShiftCoverage(date);

    // Calculate summary
    const coveredHours = coverage.filter(h => h.coverageStatus === 'covered').length;
    const partialHours = coverage.filter(h => h.coverageStatus === 'partial').length;
    const uncoveredHours = coverage.filter(h => h.coverageStatus === 'uncovered').length;
    const totalCalls = coverage.reduce((sum, h) => sum + h.callCount, 0);
    const totalMissed = coverage.reduce((sum, h) => sum + h.missedCount, 0);

    // Find gaps (uncovered hours with calls)
    const gaps: Array<{
      startHour: number;
      endHour: number;
      missedCalls: number;
    }> = [];

    let gapStart: number | null = null;
    let gapMissedCalls = 0;

    for (let i = 0; i < 24; i++) {
      if (coverage[i].coverageStatus === 'uncovered' && coverage[i].callCount > 0) {
        if (gapStart === null) gapStart = i;
        gapMissedCalls += coverage[i].missedCount;
      } else if (gapStart !== null) {
        gaps.push({ startHour: gapStart, endHour: i, missedCalls: gapMissedCalls });
        gapStart = null;
        gapMissedCalls = 0;
      }
    }

    if (gapStart !== null) {
      gaps.push({ startHour: gapStart, endHour: 24, missedCalls: gapMissedCalls });
    }

    return NextResponse.json({
      date,
      hourly: coverage,
      summary: {
        coveredHours,
        partialHours,
        uncoveredHours,
        totalCalls,
        totalMissed,
        coveragePercent: Math.round(((coveredHours + partialHours * 0.5) / 24) * 100),
      },
      gaps,
    });
  } catch (error) {
    console.error('Get coverage error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
