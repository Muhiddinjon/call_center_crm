import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getShift, updateShift, deleteShift } from '@/lib/redis';

// GET - Get single shift
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const shift = await getShift(id);

    if (!shift) {
      return NextResponse.json({ error: 'Smena topilmadi' }, { status: 404 });
    }

    return NextResponse.json(shift);
  } catch (error) {
    console.error('Get shift error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT - Update shift
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await getShift(id);
    if (!existing) {
      return NextResponse.json({ error: 'Smena topilmadi' }, { status: 404 });
    }

    // Validate date format if provided
    if (body.date && !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return NextResponse.json(
        { error: 'Sana formati noto\'g\'ri. YYYY-MM-DD formatida bo\'lishi kerak' },
        { status: 400 }
      );
    }

    // Validate time format if provided
    if (body.startTime && !/^\d{2}:\d{2}$/.test(body.startTime)) {
      return NextResponse.json(
        { error: 'Boshlanish vaqti formati noto\'g\'ri. HH:MM formatida bo\'lishi kerak' },
        { status: 400 }
      );
    }

    if (body.endTime && !/^\d{2}:\d{2}$/.test(body.endTime)) {
      return NextResponse.json(
        { error: 'Tugash vaqti formati noto\'g\'ri. HH:MM formatida bo\'lishi kerak' },
        { status: 400 }
      );
    }

    const updatedShift = await updateShift(id, {
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      status: body.status,
      notes: body.notes,
    });

    return NextResponse.json(updatedShift);
  } catch (error) {
    console.error('Update shift error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE - Delete shift
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const shift = await getShift(id);

    if (!shift) {
      return NextResponse.json({ error: 'Smena topilmadi' }, { status: 404 });
    }

    await deleteShift(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete shift error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
