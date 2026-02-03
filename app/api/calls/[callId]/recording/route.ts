import { NextRequest, NextResponse } from 'next/server';
import { getCallRecordingUrl } from '@/lib/binotel';
import { getCall } from '@/lib/redis';

// GET - Get call recording URL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;

    // Get call from Redis to verify it exists
    const call = await getCall(callId);
    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Get recording URL from Binotel (use binotel callId, not our internal id)
    const recordingUrl = await getCallRecordingUrl(call.callId);

    if (!recordingUrl) {
      return NextResponse.json(
        { error: 'Recording not available' },
        { status: 404 }
      );
    }

    return NextResponse.json({ url: recordingUrl });
  } catch (error) {
    console.error('Get recording error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
