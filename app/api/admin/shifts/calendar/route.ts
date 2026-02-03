import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { queryShifts, getAllUsers, calculateShiftHours } from '@/lib/redis';
import type { Shift } from '@/lib/types';

// GET - Get shifts for calendar view (by month)
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM format
    const userId = searchParams.get('userId') || undefined;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: 'month parametri YYYY-MM formatida bo\'lishi kerak' },
        { status: 400 }
      );
    }

    // Calculate date range for the month
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;

    // Get last day of month
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay}`;

    const shifts = await queryShifts({
      userId,
      dateFrom: startDate,
      dateTo: endDate,
      limit: 1000,
    });

    // Group shifts by date
    const shiftsByDate: Record<string, Shift[]> = {};
    let totalHours = 0;
    const operatorCounts: Record<string, number> = {};

    shifts.forEach(shift => {
      if (!shiftsByDate[shift.date]) {
        shiftsByDate[shift.date] = [];
      }
      shiftsByDate[shift.date].push(shift);

      // Calculate hours
      totalHours += calculateShiftHours(shift.startTime, shift.endTime);

      // Count shifts per operator
      operatorCounts[shift.userId] = (operatorCounts[shift.userId] || 0) + 1;
    });

    // Get user names for operator counts
    const users = await getAllUsers();
    const userMap = new Map(users.map(u => [u.id, u.fullName || u.username]));
    const operatorNames: Record<string, string> = {};
    Object.keys(operatorCounts).forEach(id => {
      operatorNames[id] = userMap.get(id) || 'Noma\'lum';
    });

    return NextResponse.json({
      month,
      shifts: shiftsByDate,
      summary: {
        totalShifts: shifts.length,
        totalHours: Math.round(totalHours * 10) / 10,
        operatorCounts,
        operatorNames,
        daysWithShifts: Object.keys(shiftsByDate).length,
      },
    });
  } catch (error) {
    console.error('Get calendar error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
