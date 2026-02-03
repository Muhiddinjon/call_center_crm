import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { queryCalls, createCall, searchCallsByPhone } from '@/lib/redis';
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

    // Run both lookups in parallel for better performance
    const [lookupResult, previousCalls] = await Promise.all([
      lookupByPhone(phoneNumber),
      searchCallsByPhone(phoneNumber),
    ]);

    // Determine caller type and region (prefer external API, fallback to local DB)
    let isDriver = lookupResult.driverInfo?.isDriver || false;
    let isClient = lookupResult.clientInfo?.isClient || false;
    let callerType: 'driver' | 'client' | undefined = isDriver ? 'driver' : isClient ? 'client' : undefined;
    let region: string | undefined;
    let driverId = lookupResult.driverInfo?.driverId;
    let driverName = lookupResult.driverInfo?.driverName;
    let driverCar = lookupResult.driverInfo?.driverCar;
    let driverRating = lookupResult.driverInfo?.driverRating;
    let driverStatus = lookupResult.driverInfo?.driverStatus;
    let managerNumber = lookupResult.driverInfo?.managerNumber;
    let driverExtraInfo = lookupResult.driverInfo?.extraInfo;

    // Get region from driver extraInfo
    const extraInfo = lookupResult.driverInfo?.extraInfo as Record<string, unknown> | undefined;
    region = extraInfo?.region as string | undefined;

    // If no info from external API, use data from previous calls
    if (!isDriver && !isClient && previousCalls.contactInfo) {
      const prevInfo = previousCalls.contactInfo;
      isDriver = prevInfo.isDriver;
      callerType = prevInfo.isDriver ? 'driver' : undefined;

      if (prevInfo.driverInfo) {
        driverId = prevInfo.driverInfo.driverId;
        driverName = prevInfo.driverInfo.driverName;
        driverCar = prevInfo.driverInfo.driverCar;
        driverRating = prevInfo.driverInfo.driverRating;
        driverStatus = prevInfo.driverInfo.driverStatus;
        managerNumber = prevInfo.driverInfo.managerNumber;
      }
    }

    // Get region from previous calls if not set
    if (!region && previousCalls.calls.length > 0) {
      const callWithRegion = previousCalls.calls.find(c => c.region);
      if (callWithRegion) {
        region = callWithRegion.region;
      }
    }

    const call = await createCall({
      phoneNumber,
      callType,
      internalNumber,
      isDriver,
      callerType,
      region,
      driverId,
      driverName,
      driverCar,
      driverRating,
      driverStatus,
      managerNumber,
      driverExtraInfo,
      operatorName: user.fullName || user.username,
    });

    return NextResponse.json(call);
  } catch (error) {
    console.error('Create call error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
