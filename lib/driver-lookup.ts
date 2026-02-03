import type { DriverInfo, ClientInfo, LookupResult } from './types';
import { normalizePhone } from './utils';
import { redis } from './redis';

const DRIVER_API_URL = process.env.DRIVER_API_URL || 'https://new-admin-mocha.vercel.app';
const CACHE_TTL = 300; // 5 minutes cache

export async function lookupByPhone(phoneNumber: string): Promise<LookupResult> {
  const normalizedPhone = normalizePhone(phoneNumber);
  const cacheKey = `lookup:${normalizedPhone}`;

  try {
    // Check Redis cache first
    const cached = await redis.get<LookupResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from external API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    // Use assign-new-driver endpoint - it returns both driver and client info
    const phoneDigits = normalizedPhone.replace(/\D/g, '').slice(-9);
    const response = await fetch(`${DRIVER_API_URL}/api/assign-new-driver?phoneNumber=${encodeURIComponent(phoneDigits)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      // Cache for 5 minutes
      next: { revalidate: 300 },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        // Cache empty result too to avoid repeated lookups
        await redis.setex(cacheKey, CACHE_TTL, {});
        return {};
      }
      throw new Error(`Driver API error: ${response.status}`);
    }

    const data = await response.json();

    const result: LookupResult = {};

    // Parse driver info from assign-new-driver response
    if (data.driver) {
      result.driverInfo = parseDriverInfo(data.driver);
    }

    // Parse client info from assign-new-driver response
    if (data.client) {
      result.clientInfo = parseClientInfo(data.client);
    }

    // Cache the result
    await redis.setex(cacheKey, CACHE_TTL, result);

    return result;
  } catch (error) {
    // On timeout or error, return empty result without blocking
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Driver lookup timeout for:', normalizedPhone);
    } else {
      console.error('Driver lookup error:', error);
    }
    return {};
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseDriverInfo(data: any): DriverInfo {
  // Calculate manager number: existing_assignment - 16 + 100
  let managerNumber: string | undefined;
  if (data.existing_assignment) {
    const assignmentId = parseInt(data.existing_assignment);
    if (!isNaN(assignmentId)) {
      managerNumber = String(assignmentId - 16 + 100);
    }
  }

  // Parse region from API response
  let region: string | undefined;
  if (data.region_name) {
    region = data.region_name;
  } else if (data.base_route?.departure?.region_name) {
    region = data.base_route.departure.region_name;
  } else if (data.base_route?.arrival?.region_name) {
    region = data.base_route.arrival.region_name;
  }

  return {
    isDriver: true,
    driverId: data.id?.toString() || data.driver_id?.toString(),
    driverName: data.name || data.full_name || data.driver_name,
    driverCar: data.car_model || data.car || formatCarInfo(data),
    driverRating: data.rating?.toString(),
    driverStatus: data.status || data.driver_status,
    managerNumber,
    extraInfo: {
      region,
      phone: data.phone,
      base_route: data.base_route,
      existing_assignment: data.existing_assignment,
      recommended_assignment: data.recommended_assignment,
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseClientInfo(data: any): ClientInfo {
  return {
    isClient: true,
    clientId: data.id?.toString() || data.client_id?.toString(),
    clientName: data.name?.trim() || data.full_name || data.client_name,
    clientPhone: data.phone,
    clientEmail: data.email,
    totalOrders: data.total_orders || data.orders_count,
    completedOrders: data.completed_orders,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatCarInfo(data: any): string {
  const parts = [];
  if (data.car_brand) parts.push(data.car_brand);
  if (data.car_model) parts.push(data.car_model);
  if (data.car_number) parts.push(`(${data.car_number})`);
  return parts.join(' ') || data.car || '';
}

export async function getDriverById(driverId: string): Promise<DriverInfo | null> {
  try {
    const response = await fetch(`${DRIVER_API_URL}/api/driver/${driverId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return parseDriverInfo(data);
  } catch (error) {
    console.error('Get driver by ID error:', error);
    return null;
  }
}

export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    // Test with a sample phone number
    const result = await lookupByPhone('+998901234567');
    return {
      success: true,
      message: 'Driver API ulanishi muvaffaqiyatli',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Noma\'lum xato',
    };
  }
}
