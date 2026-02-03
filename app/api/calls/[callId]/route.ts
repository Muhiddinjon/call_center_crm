import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCall, updateCall } from '@/lib/redis';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { callId } = await params;
    const call = await getCall(callId);

    if (!call) {
      return NextResponse.json({ error: 'Qo\'ng\'iroq topilmadi' }, { status: 404 });
    }

    return NextResponse.json(call);
  } catch (error) {
    console.error('Get call error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { callId } = await params;
    const body = await request.json();

    const { region, topic, notes, callerType } = body;

    const updatedCall = await updateCall(callId, {
      region,
      topic,
      notes,
      callerType,
      operatorName: user.fullName || user.username,
    });

    if (!updatedCall) {
      return NextResponse.json({ error: 'Qo\'ng\'iroq topilmadi' }, { status: 404 });
    }

    return NextResponse.json(updatedCall);
  } catch (error) {
    console.error('Update call error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
