import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { queryCalls } from '@/lib/redis';
import { format } from 'date-fns';
import type { CallFilters } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    const filters: CallFilters = {
      limit: 10000, // Max export limit
      offset: 0,
    };

    if (searchParams.get('dateFrom')) {
      filters.dateFrom = new Date(searchParams.get('dateFrom')!).getTime();
    }
    if (searchParams.get('dateTo')) {
      const dateTo = new Date(searchParams.get('dateTo')!);
      dateTo.setHours(23, 59, 59, 999);
      filters.dateTo = dateTo.getTime();
    }
    if (searchParams.get('region')) {
      filters.region = searchParams.get('region')!;
    }
    if (searchParams.get('callType')) {
      filters.callType = searchParams.get('callType') as 'incoming' | 'outgoing';
    }
    if (searchParams.get('callerType')) {
      filters.callerType = searchParams.get('callerType') as 'driver' | 'client';
    }
    if (searchParams.get('driverId')) {
      filters.driverId = searchParams.get('driverId')!;
    }
    if (searchParams.get('operatorName')) {
      filters.operatorName = searchParams.get('operatorName')!;
    }

    const calls = await queryCalls(filters);

    // Generate CSV
    const headers = [
      'Sana/Vaqt',
      'Telefon raqam',
      'Turi',
      'Driver/Client',
      'Driver ID',
      'Driver ismi',
      'Mashina',
      'Region',
      'Mavzu',
      'Operator',
      'Davomiyligi (sek)',
      'Izoh',
      'Call ID',
    ];

    const rows = calls.map(call => [
      format(new Date(call.callStart), 'yyyy-MM-dd HH:mm:ss'),
      call.phoneNumber,
      call.callType === 'incoming' ? 'Kiruvchi' : 'Chiquvchi',
      call.isDriver ? 'Driver' : (call.callerType === 'client' ? 'Client' : '-'),
      call.driverId || '',
      call.driverName || '',
      call.driverCar || '',
      call.region || '',
      call.topic || '',
      call.operatorName || '',
      call.callDuration?.toString() || '',
      call.notes?.replace(/"/g, '""') || '', // Escape quotes in notes
      call.callId,
    ]);

    // Build CSV string with BOM for Excel compatibility
    const BOM = '\uFEFF';
    const csv = BOM + [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const filename = `calls-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
