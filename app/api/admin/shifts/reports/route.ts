import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getShiftReport, getAllUsers, queryShifts, calculateShiftHours } from '@/lib/redis';
import type { ShiftReport } from '@/lib/types';

// GET - Get shift reports for employees
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Validate date range
    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: 'dateFrom va dateTo parametrlari majburiy' },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      return NextResponse.json(
        { error: 'Sana formati YYYY-MM-DD bo\'lishi kerak' },
        { status: 400 }
      );
    }

    if (userId) {
      // Single user report
      const report = await getShiftReport(userId, dateFrom, dateTo);
      return NextResponse.json(report);
    } else {
      // All users report
      const users = await getAllUsers();
      const operators = users.filter(u => !u.isAdmin && u.isActive);

      const reports: ShiftReport[] = [];

      for (const user of operators) {
        const report = await getShiftReport(user.id, dateFrom, dateTo);
        if (report.totalShifts > 0) {
          reports.push(report);
        }
      }

      // Sort by total shifts descending
      reports.sort((a, b) => b.totalShifts - a.totalShifts);

      // Calculate summary
      const summary = {
        totalOperators: reports.length,
        totalShifts: reports.reduce((sum, r) => sum + r.totalShifts, 0),
        totalHours: reports.reduce((sum, r) => sum + r.totalHoursScheduled, 0),
        totalCalls: reports.reduce((sum, r) => sum + r.callsDuringShift, 0),
        totalAnswered: reports.reduce((sum, r) => sum + r.answeredCalls, 0),
        totalMissed: reports.reduce((sum, r) => sum + r.missedCalls, 0),
        avgAnswerRate: reports.length > 0
          ? Math.round(reports.reduce((sum, r) => sum + r.answerRate, 0) / reports.length)
          : 0,
      };

      return NextResponse.json({
        reports,
        summary,
        period: {
          dateFrom,
          dateTo,
        },
      });
    }
  } catch (error) {
    console.error('Get shift reports error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
