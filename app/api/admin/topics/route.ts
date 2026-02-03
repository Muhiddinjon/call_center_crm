import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAllTopics, createTopic, initializeDefaultTopics } from '@/lib/redis';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize default topics if none exist
    await initializeDefaultTopics();

    const topics = await getAllTopics();
    return NextResponse.json(topics);
  } catch (error) {
    console.error('Get topics error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Mavzu nomi kiritilishi shart' },
        { status: 400 }
      );
    }

    const topic = await createTopic(name.trim());
    return NextResponse.json(topic);
  } catch (error) {
    console.error('Create topic error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
