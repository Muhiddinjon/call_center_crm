import { NextResponse } from 'next/server';
import { getDashboardStats, getOnlineCalls, getEmployeesStatus } from '@/lib/binotel';
import { getDailyStats, getUnhandledMissedCalls } from '@/lib/redis';

// GET - Get real-time monitoring data
export async function GET() {
  try {
    const [dashboardStats, onlineCalls, employeesData, dailyStats, missedCalls] = await Promise.all([
      getDashboardStats(),
      getOnlineCalls(),
      getEmployeesStatus(),
      getDailyStats(),
      getUnhandledMissedCalls(),
    ]);

    // Parse employees
    const employees: Array<{
      id: string;
      name: string;
      internalNumber: string;
      isOnline: boolean;
      isBusy: boolean;
    }> = [];

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

    return NextResponse.json({
      // Live stats from Binotel
      live: {
        onlineCalls: dashboardStats.onlineCalls,
        todayIncoming: dashboardStats.todayIncoming,
        todayOutgoing: dashboardStats.todayOutgoing,
        todayAnswered: dashboardStats.todayAnswered,
        todayMissed: dashboardStats.todayMissed,
        avgDuration: dashboardStats.avgDuration,
        employeesOnline: dashboardStats.employeesOnline,
        employeesTotal: dashboardStats.employeesTotal,
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
        // Sort: online & busy first, then online, then offline
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
      // Timestamp
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Monitoring API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
