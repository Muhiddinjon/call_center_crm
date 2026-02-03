import crypto from 'crypto';
import type { CallLog } from './types';
import { normalizePhone, getTashkentStartOfDay, getTashkentEndOfDay } from './utils';

const API_BASE = 'https://api.binotel.com/api/4.0';
const API_KEY = process.env.BINOTEL_API_KEY || '';
const API_SECRET = process.env.BINOTEL_API_SECRET || '';

interface BinotelResponse {
  status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

async function makeRequest(endpoint: string, params: Record<string, string | number | string[]> = {}): Promise<BinotelResponse> {
  // Binotel API uses key and secret directly, not a signature
  const body = {
    key: API_KEY,
    secret: API_SECRET,
    ...params,
  };

  const response = await fetch(`${API_BASE}/${endpoint}.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Binotel API error: ${response.status}`);
  }

  return response.json();
}

export async function getOnlineCalls(): Promise<Array<{
  generalCallID: string;
  externalNumber: string;
  internalNumber: string;
  callType: 'incoming' | 'outgoing';
  startTime: number;
}>> {
  try {
    const data = await makeRequest('stats/online-calls');

    if (data.status !== 'success' || !data.callsOnline) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Object.values(data.callsOnline as Record<string, any>).map((call: any) => ({
      generalCallID: call.generalCallID || call.callID,
      externalNumber: normalizePhone(call.externalNumber || ''),
      internalNumber: call.internalNumber || '',
      callType: call.callType === '1' || call.callType === 'incoming' ? 'incoming' : 'outgoing',
      startTime: call.startTime ? parseInt(call.startTime) * 1000 : Date.now(),
    }));
  } catch (error) {
    console.error('Binotel getOnlineCalls error:', error);
    return [];
  }
}

export async function getIncomingCallsForToday(): Promise<BinotelResponse> {
  // Use Tashkent timezone
  const startOfDay = getTashkentStartOfDay();
  const now = Date.now();

  return makeRequest('stats/incoming-calls-for-period', {
    startTime: Math.floor(startOfDay / 1000),
    stopTime: Math.floor(now / 1000),
  });
}

export async function getOutgoingCallsForToday(): Promise<BinotelResponse> {
  // Use Tashkent timezone
  const startOfDay = getTashkentStartOfDay();
  const now = Date.now();

  return makeRequest('stats/outgoing-calls-for-period', {
    startTime: Math.floor(startOfDay / 1000),
    stopTime: Math.floor(now / 1000),
  });
}

export async function getEmployeesStatus(): Promise<BinotelResponse> {
  return makeRequest('settings/list-of-employees');
}

// Get call recording URL
export async function getCallRecordingUrl(callId: string): Promise<string | null> {
  try {
    const data = await makeRequest('stats/call-record', {
      generalCallID: callId,
    });

    if (data.status === 'success' && data.url) {
      return data.url as string;
    }
    return null;
  } catch (error) {
    console.error('Binotel getCallRecordingUrl error:', error);
    return null;
  }
}

// Get detailed stats for dashboard
export async function getDashboardStats(): Promise<{
  onlineCalls: number;
  todayIncoming: number;
  todayOutgoing: number;
  todayAnswered: number;
  todayMissed: number;
  avgDuration: number;
  employeesOnline: number;
  employeesTotal: number;
}> {
  try {
    const [onlineData, incomingData, outgoingData, employeesData] = await Promise.all([
      makeRequest('stats/online-calls'),
      getIncomingCallsForToday(),
      getOutgoingCallsForToday(),
      getEmployeesStatus(),
    ]);

    // Count online calls
    const onlineCalls = onlineData.callsOnline
      ? Object.keys(onlineData.callsOnline).length
      : 0;

    // Parse incoming calls
    let todayIncoming = 0;
    let todayAnswered = 0;
    let todayMissed = 0;
    let totalDuration = 0;
    let callsWithDuration = 0;

    if (incomingData.status === 'success' && incomingData.callDetails) {
      const calls = Object.values(incomingData.callDetails) as Array<{
        disposition?: string;
        billsec?: string | number;
      }>;
      todayIncoming = calls.length;

      calls.forEach(call => {
        if (call.disposition === 'ANSWERED') {
          todayAnswered++;
          const duration = parseInt(String(call.billsec || 0));
          if (duration > 0) {
            totalDuration += duration;
            callsWithDuration++;
          }
        } else {
          todayMissed++;
        }
      });
    }

    // Parse outgoing calls
    let todayOutgoing = 0;
    if (outgoingData.status === 'success' && outgoingData.callDetails) {
      todayOutgoing = Object.keys(outgoingData.callDetails).length;
    }

    // Parse employees
    let employeesOnline = 0;
    let employeesTotal = 0;
    if (employeesData.status === 'success' && employeesData.listOfEmployees) {
      const employees = Object.values(employeesData.listOfEmployees) as Array<{
        isOnline?: string | number;
      }>;
      employeesTotal = employees.length;
      employeesOnline = employees.filter(e => e.isOnline === '1' || e.isOnline === 1).length;
    }

    return {
      onlineCalls,
      todayIncoming,
      todayOutgoing,
      todayAnswered,
      todayMissed,
      avgDuration: callsWithDuration > 0 ? Math.round(totalDuration / callsWithDuration) : 0,
      employeesOnline,
      employeesTotal,
    };
  } catch (error) {
    console.error('Binotel getDashboardStats error:', error);
    return {
      onlineCalls: 0,
      todayIncoming: 0,
      todayOutgoing: 0,
      todayAnswered: 0,
      todayMissed: 0,
      avgDuration: 0,
      employeesOnline: 0,
      employeesTotal: 0,
    };
  }
}

export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const data = await makeRequest('settings/list-of-employees');
    return {
      success: data.status === 'success',
      message: data.status === 'success' ? 'Ulanish muvaffaqiyatli' : 'Ulanish xatosi',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Noma\'lum xato',
    };
  }
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!signature) return true; // Skip if no signature provided

  const expectedSignature = crypto
    .createHmac('sha256', API_SECRET)
    .update(payload)
    .digest('hex');

  return signature === expectedSignature;
}

export function parseWebhookEvent(data: Record<string, unknown>): {
  event: string;
  callId: string;
  phoneNumber: string;
  internalNumber: string;
  callType: 'incoming' | 'outgoing';
  duration?: number;
} {
  // Binotel can send different event formats
  const event = (data.event || data.callType || data.type || 'unknown') as string;
  const callId = (data.generalCallID || data.callID || data.call_id || '') as string;
  const phoneNumber = normalizePhone((data.externalNumber || data.phone || data.phone_number || '') as string);
  const internalNumber = (data.internalNumber || data.internal_number || '') as string;
  const duration = data.duration ? parseInt(data.duration as string) : undefined;

  // Determine call type
  let callType: 'incoming' | 'outgoing' = 'incoming';
  if (data.callType === '2' || data.callType === 'outgoing' || data.direction === 'outgoing') {
    callType = 'outgoing';
  }

  return {
    event,
    callId,
    phoneNumber,
    internalNumber,
    callType,
    duration,
  };
}

// Get Binotel stats for sync comparison
export async function getBinotelStatsForSync(): Promise<{
  incoming: number;
  outgoing: number;
  answered: number;
  missed: number;
} | null> {
  try {
    const stats = await getDashboardStats();
    return {
      incoming: stats.todayIncoming,
      outgoing: stats.todayOutgoing,
      answered: stats.todayAnswered,
      missed: stats.todayMissed,
    };
  } catch (error) {
    console.error('Binotel getBinotelStatsForSync error:', error);
    return null;
  }
}

// Get today's calls from Binotel for syncing
export interface BinotelCallDetail {
  generalCallID: string;
  callType: string; // '1' = incoming, '2' = outgoing
  externalNumber: string;
  internalNumber: string;
  startTime: string; // Unix timestamp
  waitsec: string;
  billsec: string; // Call duration in seconds
  disposition: string; // ANSWERED, NO ANSWER, BUSY, etc.
  isNewCall?: string;
  companyID?: string;
}

export async function getTodayCallsFromBinotel(): Promise<BinotelCallDetail[]> {
  try {
    // Use Tashkent timezone for start/end of day
    const startOfDay = getTashkentStartOfDay();
    const now = Date.now();

    const data = await makeRequest('stats/list-of-calls-for-period', {
      startTime: Math.floor(startOfDay / 1000),
      stopTime: Math.floor(now / 1000),
    });

    if (data.status !== 'success' || !data.callDetails) {
      console.log('Binotel getTodayCallsFromBinotel: no call details');
      return [];
    }

    return Object.values(data.callDetails) as BinotelCallDetail[];
  } catch (error) {
    console.error('Binotel getTodayCallsFromBinotel error:', error);
    return [];
  }
}

// Get call details by generalCallID
export async function getCallDetails(callIds: string[]): Promise<Record<string, BinotelCallDetail>> {
  try {
    if (callIds.length === 0) return {};

    const data = await makeRequest('stats/call-details', {
      generalCallID: callIds,
    });

    if (data.status !== 'success' || !data.callDetails) {
      return {};
    }

    return data.callDetails as Record<string, BinotelCallDetail>;
  } catch (error) {
    console.error('Binotel getCallDetails error:', error);
    return {};
  }
}

export type { CallLog };
