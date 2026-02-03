'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Users,
  Clock,
  RefreshCw,
  Wifi,
  WifiOff,
  User,
  Headphones,
  PhoneCall,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatPhone, formatDuration, cn } from '@/lib/utils';

interface MonitoringData {
  live: {
    onlineCalls: number;
    todayIncoming: number;
    todayOutgoing: number;
    todayAnswered: number;
    todayMissed: number;
    avgDuration: number;
    employeesOnline: number;
    employeesTotal: number;
  };
  activeCalls: Array<{
    id: string;
    phoneNumber: string;
    internalNumber: string;
    callType: 'incoming' | 'outgoing';
    startTime: number;
    duration: number;
  }>;
  employees: Array<{
    id: string;
    name: string;
    internalNumber: string;
    isOnline: boolean;
    isBusy: boolean;
  }>;
  dailyStats: {
    totalCalls: number;
    answeredCalls: number;
    missedCalls: number;
    avgDuration: number;
    byHour: Record<number, number>;
  };
  missedCallsCount: number;
  timestamp: number;
}

export default function MonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/monitoring');
      if (response.ok) {
        const result = await response.json();
        setData(result);
        setLastUpdate(new Date());
        setError(null);
      } else {
        setError('Ma\'lumotlarni yuklashda xatolik');
      }
    } catch (err) {
      setError('Server bilan aloqa yo\'q');
      console.error('Monitoring fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto refresh every 10 seconds
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchData();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Calculate live call durations
  useEffect(() => {
    if (!data?.activeCalls.length) return;

    const interval = setInterval(() => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          activeCalls: prev.activeCalls.map((call) => ({
            ...call,
            duration: Math.floor((Date.now() - call.startTime) / 1000),
          })),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [data?.activeCalls.length]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Activity className="w-7 h-7 text-green-600" />
            Real-time Monitoring
          </h1>
          <p className="text-gray-500">
            Jonli statistika va operator holati
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Auto refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
              autoRefresh
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            )}
          >
            {autoRefresh ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {autoRefresh ? 'Auto yangilanish' : 'To\'xtatilgan'}
            </span>
          </button>

          {/* Manual refresh */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Yangilash
          </button>
        </div>
      </div>

      {/* Last update time */}
      {lastUpdate && (
        <p className="text-sm text-gray-500">
          Oxirgi yangilanish: {format(lastUpdate, 'HH:mm:ss')}
        </p>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
      )}

      {/* Live Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {/* Active calls - highlighted */}
        <div className="col-span-2 card bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="card-body flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <PhoneCall className="w-7 h-7" />
            </div>
            <div>
              <div className="text-4xl font-bold">
                {loading ? '...' : data?.live.onlineCalls || 0}
              </div>
              <div className="text-green-100">Joriy qo&apos;ng&apos;iroqlar</div>
            </div>
          </div>
        </div>

        {/* Today's stats */}
        <div className="card">
          <div className="card-body text-center">
            <PhoneIncoming className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">
              {loading ? '...' : data?.live.todayIncoming || 0}
            </div>
            <div className="text-xs text-gray-500">Kiruvchi</div>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <PhoneOutgoing className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">
              {loading ? '...' : data?.live.todayOutgoing || 0}
            </div>
            <div className="text-xs text-gray-500">Chiquvchi</div>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <Phone className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">
              {loading ? '...' : data?.live.todayAnswered || 0}
            </div>
            <div className="text-xs text-gray-500">Javob berilgan</div>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <PhoneMissed className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">
              {loading ? '...' : data?.live.todayMissed || 0}
            </div>
            <div className="text-xs text-gray-500">O&apos;tkazib yuborilgan</div>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <Clock className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">
              {loading ? '...' : formatDuration(data?.live.avgDuration || 0)}
            </div>
            <div className="text-xs text-gray-500">O&apos;rtacha vaqt</div>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">
              {loading
                ? '...'
                : `${data?.live.employeesOnline || 0}/${data?.live.employeesTotal || 0}`}
            </div>
            <div className="text-xs text-gray-500">Operatorlar online</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Calls */}
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-green-600" />
              Joriy qo&apos;ng&apos;iroqlar
              {data?.activeCalls.length ? (
                <span className="badge badge-green animate-pulse">
                  {data.activeCalls.length} ta
                </span>
              ) : null}
            </div>
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : data?.activeCalls.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Phone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Hozirda aktiv qo&apos;ng&apos;iroq yo&apos;q</p>
              </div>
            ) : (
              <div className="divide-y">
                {data?.activeCalls.map((call) => (
                  <div
                    key={call.id}
                    className="p-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          call.callType === 'incoming'
                            ? 'bg-green-100'
                            : 'bg-blue-100'
                        )}
                      >
                        {call.callType === 'incoming' ? (
                          <PhoneIncoming className="w-5 h-5 text-green-600" />
                        ) : (
                          <PhoneOutgoing className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {formatPhone(call.phoneNumber)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {call.callType === 'incoming' ? 'Kiruvchi' : 'Chiquvchi'}{' '}
                          • Operator: {call.internalNumber || '-'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono font-bold text-green-600">
                        {formatDuration(call.duration)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(call.startTime), 'HH:mm:ss')} dan
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Operators Status */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Headphones className="w-5 h-5 text-blue-600" />
            Operatorlar holati
          </div>
          <div className="card-body p-0 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : data?.employees.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Operatorlar topilmadi</p>
              </div>
            ) : (
              <div className="divide-y">
                {data?.employees.map((emp) => (
                  <div
                    key={emp.id}
                    className={cn(
                      'p-3 flex items-center gap-3',
                      !emp.isOnline && 'opacity-50'
                    )}
                  >
                    {/* Status indicator */}
                    <div className="relative">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          emp.isBusy
                            ? 'bg-red-100'
                            : emp.isOnline
                            ? 'bg-green-100'
                            : 'bg-gray-100'
                        )}
                      >
                        <User
                          className={cn(
                            'w-5 h-5',
                            emp.isBusy
                              ? 'text-red-600'
                              : emp.isOnline
                              ? 'text-green-600'
                              : 'text-gray-400'
                          )}
                        />
                      </div>
                      {emp.isOnline && (
                        <div
                          className={cn(
                            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
                            emp.isBusy ? 'bg-red-500' : 'bg-green-500'
                          )}
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 truncate">
                        {emp.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {emp.internalNumber ? `#${emp.internalNumber}` : '-'}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span
                      className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        emp.isBusy
                          ? 'bg-red-100 text-red-700'
                          : emp.isOnline
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {emp.isBusy ? 'Band' : emp.isOnline ? 'Bo\'sh' : 'Offline'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hourly Chart */}
      {data?.dailyStats && (
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Soatlik taqsimot (Redis ma&apos;lumotlari)
          </div>
          <div className="card-body">
            <div className="flex items-end gap-1 h-40">
              {Object.entries(data.dailyStats.byHour || {}).map(([hour, count]) => {
                const maxCount = Math.max(
                  ...Object.values(data.dailyStats.byHour || {}),
                  1
                );
                const height = (count / maxCount) * 100;
                const currentHour = new Date().getHours();
                const isCurrentHour = parseInt(hour) === currentHour;

                return (
                  <div key={hour} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex items-end h-32">
                      <div
                        className={cn(
                          'w-full rounded-t transition-all',
                          isCurrentHour
                            ? 'bg-green-500'
                            : parseInt(hour) < currentHour
                            ? 'bg-blue-500'
                            : 'bg-gray-300'
                        )}
                        style={{ height: `${height}%` }}
                        title={`${hour}:00 - ${count} ta qo'ng'iroq`}
                      />
                    </div>
                    <span className="text-xs text-gray-500 mt-1">
                      {parseInt(hour) % 2 === 0 ? hour : ''}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-gray-600">O&apos;tgan soatlar</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-gray-600">Joriy soat</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-300 rounded" />
                <span className="text-gray-600">Keyingi soatlar</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
