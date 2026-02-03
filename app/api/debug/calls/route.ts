import { NextResponse } from 'next/server';
import { queryCalls } from '@/lib/redis';
import { getTashkentStartOfDay, getTashkentEndOfDay } from '@/lib/utils';

// GET - Debug endpoint to check call data
export async function GET() {
  try {
    const startOfDay = getTashkentStartOfDay();
    const endOfDay = getTashkentEndOfDay();

    const calls = await queryCalls({
      dateFrom: startOfDay,
      dateTo: endOfDay,
      limit: 100,
    });

    // Analyze calls
    const analysis = {
      totalCalls: calls.length,
      withCallEnd: calls.filter(c => c.callEnd).length,
      withoutCallEnd: calls.filter(c => !c.callEnd).length,
      withDuration: calls.filter(c => c.callDuration && c.callDuration > 0).length,
      zeroDuration: calls.filter(c => c.callEnd && (!c.callDuration || c.callDuration === 0)).length,
      incoming: calls.filter(c => c.callType === 'incoming').length,
      outgoing: calls.filter(c => c.callType === 'outgoing').length,
    };

    // Sample calls (first 5)
    const sampleCalls = calls.slice(0, 5).map(c => ({
      id: c.id,
      callId: c.callId,
      phoneNumber: c.phoneNumber,
      callType: c.callType,
      callStart: c.callStart,
      callEnd: c.callEnd,
      callDuration: c.callDuration,
      hasCallEnd: !!c.callEnd,
      hasDuration: !!c.callDuration,
    }));

    return NextResponse.json({
      analysis,
      sampleCalls,
      issue: analysis.withoutCallEnd > 0
        ? 'Ko\'pchilik qo\'ng\'iroqlarda callEnd yo\'q! Binotel webhook call_end eventni yubormayapti.'
        : 'OK',
      solution: 'Binotel admin panelida webhook URL ni sozlang va call_end (yoki callCompleted) eventlarini yoqing.',
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Debug error', details: String(error) }, { status: 500 });
  }
}
