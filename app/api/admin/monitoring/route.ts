import { NextResponse } from 'next/server';
import { getDashboardStats, getOnlineCalls, getEmployeesStatus } from '@/lib/binotel';
import { getDailyStats, getUnhandledMissedCalls, queryCalls } from '@/lib/redis';

// GET - Get real-time monitoring data
export async function GET() {
  try {
    // Get Redis data first (always available)
    const [dailyStats, missedCalls] = await Promise.all([
      getDailyStats(),
      getUnhandledMissedCalls(),
    ]);

    // Try to get Binotel data, but don't fail if unavailable
    let binotelStats = {
      onlineCalls: 0,
      todayIncoming: 0,
      todayOutgoing: 0,
      todayAnswered: 0,
      todayMissed: 0,
      avgDuration: 0,
      employeesOnline: 0,
      employeesTotal: 0,
    };
    let onlineCalls: Array<{
      generalCallID: string;
      externalNumber: string;
      internalNumber: string;
      callType: 'incoming' | 'outgoing';
      startTime: number;
    }> = [];
    let employees: Array<{
      id: string;
      name: string;
      internalNumber: string;
      isOnline: boolean;
      isBusy: boolean;
    }> = [];
    let binotelAvailable = false;

    try {
      const [dashboardStats, onlineCallsData, employeesData] = await Promise.all([
        getDashboardStats(),
        getOnlineCalls(),
        getEmployeesStatus(),
      ]);

      binotelStats = dashboardStats;
      onlineCalls = onlineCallsData;
      binotelAvailable = true;

      // Parse employees
      if (employeesData.status === 'success' && employeesData.listOfEmployees) {
        const employeeList = employeesData.listOfEmployees as Record<
          string,
          {
            employeeID?: string;
            name?: string;
            internalNumber?: string;
            isOnline?: string | number;
            isBusy?: string | number;
          }
        >;

        for (const [id, emp] of Object.entries(employeeList)) {
          employees.push({
            id: emp.employeeID || id,
            name: emp.name || 'Noma\'lum',
            internalNumber: emp.internalNumber || '',
            isOnline: emp.isOnline === '1' || emp.isOnline === 1,
            isBusy: emp.isBusy === '1' || emp.isBusy === 1,
          });
        }
      }
    } catch (binotelError) {
      console.warn('Binotel API unavailable, using Redis data only:', binotelError);
      // Use Redis data to fill in stats
      binotelStats = {
        onlineCalls: 0,
        todayIncoming: dailyStats.totalCalls,
        todayOutgoing: 0,
        todayAnswered: dailyStats.answeredCalls,
        todayMissed: dailyStats.missedCalls,
        avgDuration: dailyStats.avgDuration,
        employeesOnline: 0,
        employeesTotal: 0,
      };
    }

    // Calculate stats sync comparison
    const statsSync = {
      binotel: {
        incoming: binotelStats.todayIncoming,
        outgoing: binotelStats.todayOutgoing,
        answered: binotelStats.todayAnswered,
        missed: binotelStats.todayMissed,
      },
      local: {
        incoming: dailyStats.totalCalls,
        outgoing: 0, // We don't track outgoing separately in daily stats
        answered: dailyStats.answeredCalls,
        missed: dailyStats.missedCalls,
      },
      diff: {
        incoming: binotelStats.todayIncoming - dailyStats.totalCalls,
        outgoing: binotelStats.todayOutgoing,
        answered: binotelStats.todayAnswered - dailyStats.answeredCalls,
        missed: binotelStats.todayMissed - dailyStats.missedCalls,
      },
      syncedAt: Date.now(),
      binotelAvailable,
      // Flag if there's significant discrepancy (>5%)
      hasDiscrepancy: binotelAvailable &&
        dailyStats.totalCalls > 0 &&
        Math.abs(binotelStats.todayIncoming - dailyStats.totalCalls) / dailyStats.totalCalls > 0.05,
    };

    return NextResponse.json({
      // Live stats (from Binotel or Redis fallback)
      live: {
        onlineCalls: binotelStats.onlineCalls,
        todayIncoming: binotelStats.todayIncoming || dailyStats.totalCalls,
        todayOutgoing: binotelStats.todayOutgoing,
        todayAnswered: binotelStats.todayAnswered || dailyStats.answeredCalls,
        todayMissed: binotelStats.todayMissed || dailyStats.missedCalls,
        avgDuration: binotelStats.avgDuration || dailyStats.avgDuration,
        employeesOnline: binotelStats.employeesOnline,
        employeesTotal: binotelStats.employeesTotal,
      },
      // Online calls details
      activeCalls: onlineCalls.map((call) => ({
        id: call.generalCallID,
        phoneNumber: call.externalNumber,
        internalNumber: call.internalNumber,
        callType: call.callType,
        startTime: call.startTime,
        duration: Math.floor((Date.now() - call.startTime) / 1000),
      })),
      // Employees status
      employees: employees.sort((a, b) => {
        if (a.isOnline && a.isBusy && !(b.isOnline && b.isBusy)) return -1;
        if (b.isOnline && b.isBusy && !(a.isOnline && a.isBusy)) return 1;
        if (a.isOnline && !b.isOnline) return -1;
        if (b.isOnline && !a.isOnline) return 1;
        return a.name.localeCompare(b.name);
      }),
      // Daily stats from Redis
      dailyStats,
      // Unhandled missed calls count
      missedCallsCount: missedCalls.length,
      // Binotel status
      binotelAvailable,
      // Statistics sync comparison
      statsSync,
      // Timestamp
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Monitoring API error:', error);
    // Return empty data instead of error
    return NextResponse.json({
      live: {
        onlineCalls: 0,
        todayIncoming: 0,
        todayOutgoing: 0,
        todayAnswered: 0,
        todayMissed: 0,
        avgDuration: 0,
        employeesOnline: 0,
        employeesTotal: 0,
      },
      activeCalls: [],
      employees: [],
      dailyStats: {
        totalCalls: 0,
        answeredCalls: 0,
        missedCalls: 0,
        avgDuration: 0,
        byHour: {},
      },
      missedCallsCount: 0,
      binotelAvailable: false,
      timestamp: Date.now(),
      error: 'Data loading failed',
    });
  }
}
