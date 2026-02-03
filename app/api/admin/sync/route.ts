import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTodayCallsFromBinotel, type BinotelCallDetail } from '@/lib/binotel';
import { queryCalls, updateCall, createCall, redis, KEYS } from '@/lib/redis';
import { getTashkentStartOfDay, getTashkentEndOfDay, normalizePhone } from '@/lib/utils';

// POST - Sync today's calls from Binotel
export async function POST() {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting Binotel sync...');

    // Get today's calls from Binotel
    const binotelCalls = await getTodayCallsFromBinotel();
    console.log(`Binotel returned ${binotelCalls.length} calls`);

    if (binotelCalls.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Binotel dan qo\'ng\'iroqlar topilmadi',
        stats: { synced: 0, created: 0, updated: 0, errors: 0 },
      });
    }

    // Get our local calls for today
    const startOfDay = getTashkentStartOfDay();
    const endOfDay = getTashkentEndOfDay();
    const localCalls = await queryCalls({
      dateFrom: startOfDay,
      dateTo: endOfDay,
      limit: 10000,
    });

    console.log(`Local has ${localCalls.length} calls`);

    // Create a map of local calls by generalCallID (Binotel's callId)
    const localCallsMap = new Map<string, typeof localCalls[0]>();
    localCalls.forEach(call => {
      if (call.callId) {
        localCallsMap.set(call.callId, call);
      }
    });

    let created = 0;
    let updated = 0;
    let errors = 0;

    // Process each Binotel call
    for (const binotelCall of binotelCalls) {
      try {
        const callId = binotelCall.generalCallID;
        const localCall = localCallsMap.get(callId);

        // Calculate call end and duration
        const startTime = parseInt(binotelCall.startTime) * 1000;
        const duration = parseInt(binotelCall.billsec || '0');
        const callEnd = startTime + (duration * 1000);
        const isAnswered = binotelCall.disposition === 'ANSWERED';
        const callType = binotelCall.callType === '1' ? 'incoming' : 'outgoing';

        if (localCall) {
          // Update existing call if it doesn't have callEnd
          if (!localCall.callEnd || !localCall.callDuration) {
            await updateCall(localCall.id, {
              callEnd,
              callDuration: duration,
            });
            updated++;
          }
        } else {
          // Create new call from Binotel data
          await createCall({
            callId,
            phoneNumber: normalizePhone(binotelCall.externalNumber),
            internalNumber: binotelCall.internalNumber,
            callType,
            callStart: startTime,
            isDriver: false,
            callEnd,
            callDuration: duration,
          });
          created++;
        }
      } catch (err) {
        console.error(`Error processing call ${binotelCall.generalCallID}:`, err);
        errors++;
      }
    }

    const stats = {
      binotelCalls: binotelCalls.length,
      localCalls: localCalls.length,
      created,
      updated,
      errors,
      synced: created + updated,
    };

    console.log('Sync completed:', stats);

    return NextResponse.json({
      success: true,
      message: `Sync bajarildi: ${created} ta yaratildi, ${updated} ta yangilandi`,
      stats,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync xatosi', details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Check sync status and Binotel connection
export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to get calls from Binotel to check connection
    const binotelCalls = await getTodayCallsFromBinotel();

    // Get local stats
    const startOfDay = getTashkentStartOfDay();
    const endOfDay = getTashkentEndOfDay();
    const localCalls = await queryCalls({
      dateFrom: startOfDay,
      dateTo: endOfDay,
      limit: 10000,
    });

    // Count calls with/without callEnd
    const withCallEnd = localCalls.filter(c => c.callEnd).length;
    const withoutCallEnd = localCalls.filter(c => !c.callEnd).length;

    return NextResponse.json({
      binotelConnected: binotelCalls.length > 0 || true, // API worked even if no calls
      binotelCallsToday: binotelCalls.length,
      localCallsToday: localCalls.length,
      localCallsWithEnd: withCallEnd,
      localCallsWithoutEnd: withoutCallEnd,
      needsSync: withoutCallEnd > 0,
    });
  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json({
      binotelConnected: false,
      error: String(error),
    });
  }
}
