import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createShift, getUser, getShiftsByDate } from '@/lib/redis';
import type { Shift } from '@/lib/types';

// POST - Create multiple shifts at once
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, dates, startTime, endTime, notes, skipConflicts } = body;

    // Validate required fields
    if (!userId || !dates || !Array.isArray(dates) || dates.length === 0 || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'userId, dates (array), startTime, endTime majburiy' },
        { status: 400 }
      );
    }

    // Validate user exists
    const user = await getUser(userId);
    if (!user) {
      return NextResponse.json({ error: 'User topilmadi' }, { status: 404 });
    }

    // Validate time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return NextResponse.json(
        { error: 'Vaqt formati noto\'g\'ri. HH:MM formatida bo\'lishi kerak' },
        { status: 400 }
      );
    }

    const created: Shift[] = [];
    const errors: Array<{ date: string; error: string }> = [];
    const skipped: string[] = [];

    for (const date of dates) {
      try {
        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          errors.push({ date, error: 'Sana formati noto\'g\'ri' });
          continue;
        }

        // Check for conflicts (same user, same date, overlapping time)
        const existingShifts = await getShiftsByDate(date);
        const conflict = existingShifts.find(s =>
          s.userId === userId && hasTimeOverlap(s.startTime, s.endTime, startTime, endTime)
        );

        if (conflict) {
          if (skipConflicts) {
            skipped.push(date);
            continue;
          } else {
            errors.push({
              date,
              error: `Bu sanada ${conflict.startTime}-${conflict.endTime} vaqtida smena mavjud`
            });
            continue;
          }
        }

        const shift = await createShift({
          userId,
          date,
          startTime,
          endTime,
          notes,
          createdBy: session.userId,
        });

        created.push(shift);
      } catch (err) {
        errors.push({ date, error: 'Xatolik yuz berdi' });
      }
    }

    return NextResponse.json({
      created,
      errors,
      skipped,
      summary: {
        total: dates.length,
        created: created.length,
        errors: errors.length,
        skipped: skipped.length,
      },
    }, { status: created.length > 0 ? 201 : 400 });
  } catch (error) {
    console.error('Bulk create shifts error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Helper function to check time overlap
function hasTimeOverlap(
  start1: string, end1: string,
  start2: string, end2: string
): boolean {
  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const s1 = toMinutes(start1);
  let e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  let e2 = toMinutes(end2);

  // Handle overnight shifts
  if (e1 < s1) e1 += 24 * 60;
  if (e2 < s2) e2 += 24 * 60;

  // Check overlap
  return s1 < e2 && s2 < e1;
}
