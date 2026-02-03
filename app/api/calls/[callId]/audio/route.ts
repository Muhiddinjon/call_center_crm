import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCall } from '@/lib/redis';
import { getCallRecordingUrl } from '@/lib/binotel';

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

    // Get audio URL from Binotel using the Binotel callId
    const audioUrl = await getCallRecordingUrl(call.callId);

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'Audio yozuvi topilmadi' },
        { status: 404 }
      );
    }

    return NextResponse.json({ audioUrl });
  } catch (error) {
    console.error('Get call audio error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
