import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, parseWebhookEvent } from '@/lib/binotel';
import { createCall, endCall, publishEvent, getCallByCallId, addMissedCall } from '@/lib/redis';
import { lookupByPhone } from '@/lib/driver-lookup';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('X-Binotel-Signature') || '';

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.warn('Binotel webhook: Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(body);
    const callData = parseWebhookEvent(data);

    console.log(`Binotel webhook: ${callData.event}, Call ID: ${callData.callId}, Phone: ${callData.phoneNumber}`);

    // Handle different events
    if (['call.start', 'incoming.call', 'call_start'].includes(callData.event)) {
      // Lookup driver info (optional - don't fail if lookup fails)
      let lookupResult = {};
      try {
        lookupResult = await lookupByPhone(callData.phoneNumber);
        console.log('Driver lookup result:', JSON.stringify(lookupResult));
      } catch (lookupError) {
        console.warn('Driver lookup failed, continuing without driver info:', lookupError);
      }

      const driverInfo = (lookupResult as { driverInfo?: { isDriver?: boolean; driverId?: string; driverName?: string; driverCar?: string; driverRating?: string; driverStatus?: string; managerNumber?: string; extraInfo?: Record<string, unknown> } }).driverInfo;
      const clientInfo = (lookupResult as { clientInfo?: { isClient?: boolean } }).clientInfo;

      const call = await createCall({
        callId: callData.callId,
        phoneNumber: callData.phoneNumber,
        internalNumber: callData.internalNumber,
        callType: callData.callType,
        isDriver: driverInfo?.isDriver || false,
        driverId: driverInfo?.driverId,
        driverName: driverInfo?.driverName,
        driverCar: driverInfo?.driverCar,
        driverRating: driverInfo?.driverRating,
        driverStatus: driverInfo?.driverStatus,
        managerNumber: driverInfo?.managerNumber,
        driverExtraInfo: driverInfo?.extraInfo,
        callerType: driverInfo?.isDriver ? 'driver' :
                   clientInfo?.isClient ? 'client' : undefined,
      });

      console.log('Call created:', call.id);

      // Publish real-time event for incoming calls
      if (callData.callType === 'incoming') {
        await publishEvent({
          type: 'incoming_call',
          data: {
            ...call,
            driverInfo,
            clientInfo,
          },
        });
        console.log(`Incoming call notification sent: ${callData.phoneNumber}`);
      }
    } else if (['call.end', 'call_end', 'hangup'].includes(callData.event)) {
      // Update call end time
      const updatedCall = await endCall(callData.callId, callData.duration);

      // Check if this is a missed call (incoming call with no duration)
      if (updatedCall && updatedCall.callType === 'incoming' && (!callData.duration || callData.duration === 0)) {
        // Add to missed calls with auto-assignment
        const missedCall = await addMissedCall(updatedCall, true);
        console.log(`Missed call detected and assigned: ${callData.callId}, assigned to: ${missedCall.assignedOperator || 'no one on shift'}`);

        // Publish missed call event
        await publishEvent({
          type: 'missed_call',
          data: missedCall,
        });
      }

      // Publish call ended event
      await publishEvent({
        type: 'call_ended',
        data: { callId: callData.callId },
      });

      console.log(`Call ended: ${callData.callId}, duration: ${callData.duration || 0}s`);
    }

    return NextResponse.json({ status: 'ok', message: 'Webhook received' });
  } catch (error) {
    console.error('Binotel webhook error:', error);
    return NextResponse.json({ error: 'Internal error', details: String(error) }, { status: 500 });
  }
}

// Also handle GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Webhook endpoint ready' });
}
