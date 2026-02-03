import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { queryCalls, createCall } from '@/lib/redis';
import { lookupByPhone } from '@/lib/driver-lookup';
import type { CallFilters } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const filters: CallFilters = {
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    if (searchParams.get('dateFrom')) {
      filters.dateFrom = new Date(searchParams.get('dateFrom')!).getTime();
    }
    if (searchParams.get('dateTo')) {
      filters.dateTo = new Date(searchParams.get('dateTo')!).getTime();
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
    if (searchParams.get('phoneNumber')) {
      filters.phoneNumber = searchParams.get('phoneNumber')!;
    }

    const calls = await queryCalls(filters);

    return NextResponse.json(calls);
  } catch (error) {
    console.error('Get calls error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// Manual call creation
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumber, callType = 'incoming', internalNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Telefon raqami kiritilishi shart' },
        { status: 400 }
      );
    }

    // Lookup driver/client info
    const lookupResult = await lookupByPhone(phoneNumber);

    const call = await createCall({
      phoneNumber,
      callType,
      internalNumber,
      isDriver: lookupResult.driverInfo?.isDriver || false,
      driverId: lookupResult.driverInfo?.driverId,
      driverName: lookupResult.driverInfo?.driverName,
      driverCar: lookupResult.driverInfo?.driverCar,
      driverRating: lookupResult.driverInfo?.driverRating,
      driverStatus: lookupResult.driverInfo?.driverStatus,
      managerNumber: lookupResult.driverInfo?.managerNumber,
      driverExtraInfo: lookupResult.driverInfo?.extraInfo,
      operatorName: user.fullName || user.username,
    });

    return NextResponse.json(call);
  } catch (error) {
    console.error('Create call error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
