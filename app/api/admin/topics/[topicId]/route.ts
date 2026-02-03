import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTopic, updateTopic, deleteTopic } from '@/lib/redis';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { topicId } = await params;
    const topic = await getTopic(topicId);

    if (!topic) {
      return NextResponse.json({ error: 'Mavzu topilmadi' }, { status: 404 });
    }

    return NextResponse.json(topic);
  } catch (error) {
    console.error('Get topic error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { topicId } = await params;
    const body = await request.json();

    const topic = await updateTopic(topicId, {
      name: body.name,
      isActive: body.isActive,
      order: body.order,
    });

    if (!topic) {
      return NextResponse.json({ error: 'Mavzu topilmadi' }, { status: 404 });
    }

    return NextResponse.json(topic);
  } catch (error) {
    console.error('Update topic error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { topicId } = await params;
    const deleted = await deleteTopic(topicId);

    if (!deleted) {
      return NextResponse.json({ error: 'Mavzu topilmadi' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete topic error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
