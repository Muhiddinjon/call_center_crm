import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createShift, queryShifts, getUser } from '@/lib/redis';
import type { ShiftFilters } from '@/lib/types';

// GET - List shifts with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const status = searchParams.get('status') as ShiftFilters['status'] | undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const filters: ShiftFilters = {
      userId,
      dateFrom,
      dateTo,
      status,
      limit,
      offset,
    };

    const shifts = await queryShifts(filters);

    return NextResponse.json({
      shifts,
      total: shifts.length,
      filters,
    });
  } catch (error) {
    console.error('Get shifts error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - Create new shift
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, date, startTime, endTime, notes } = body;

    // Validate required fields
    if (!userId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'userId, date, startTime, endTime majburiy' },
        { status: 400 }
      );
    }

    // Validate user exists
    const user = await getUser(userId);
    if (!user) {
      return NextResponse.json({ error: 'User topilmadi' }, { status: 404 });
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Sana formati noto\'g\'ri. YYYY-MM-DD formatida bo\'lishi kerak' },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return NextResponse.json(
        { error: 'Vaqt formati noto\'g\'ri. HH:MM formatida bo\'lishi kerak' },
        { status: 400 }
      );
    }

    const shift = await createShift({
      userId,
      date,
      startTime,
      endTime,
      notes,
      createdBy: session.userId,
    });

    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error('Create shift error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
