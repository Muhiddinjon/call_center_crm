import { NextRequest, NextResponse } from 'next/server';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';

// Debug endpoint - logs everything Binotel sends
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers: Record<string, string> = {};

    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    console.log('=== DEBUG WEBHOOK ===');
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('Body:', body);
    console.log('=== END DEBUG ===');

    // Parse and show what we received
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(body);
    } catch {
      console.log('Body is not JSON');
    }

    // Also trigger Pusher with raw data for testing
    if (data.externalNumber || data.phone) {
      const testCall = {
        id: `debug-${Date.now()}`,
        callId: (data.generalCallID || data.callID || `debug-${Date.now()}`) as string,
        phoneNumber: (data.externalNumber || data.phone || 'unknown') as string,
        callType: 'incoming' as const,
        callStart: Date.now(),
        isDriver: false,
      };

      await pusherServer.trigger(CHANNELS.CALLS, EVENTS.INCOMING_CALL, testCall);
      console.log('Debug: Pusher event sent for', testCall.phoneNumber);
    }

    return NextResponse.json({
      status: 'ok',
      received: {
        headers,
        body: data,
      }
    });
  } catch (error) {
    console.error('Debug webhook error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Debug webhook ready' });
}
