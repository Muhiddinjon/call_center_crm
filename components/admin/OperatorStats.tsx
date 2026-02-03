'use client';

import { useState, useEffect } from 'react';
import { Users, Phone, PhoneMissed, Clock, TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import type { OperatorStats as OperatorStatsType } from '@/lib/types';

interface DailyStats {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgDuration: number;
  byHour: Record<number, number>;
}

export function OperatorStats() {
  const [operatorStats, setOperatorStats] = useState<OperatorStatsType[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [operatorRes, dailyRes] = await Promise.all([
        fetch(`/api/admin/stats?type=operators&dateFrom=${dateRange.from}&dateTo=${dateRange.to}`),
        fetch(`/api/admin/stats?type=daily&dateFrom=${dateRange.from}`),
      ]);

      if (operatorRes.ok) {
        const data = await operatorRes.json();
        setOperatorStats(data);
      }

      if (dailyRes.ok) {
        const data = await dailyRes.json();
        setDailyStats(data);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Date filter */}
      <div className="card">
        <div className="card-body flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sana:</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="form-input text-sm py-1"
            />
            <span className="text-gray-400">—</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="form-input text-sm py-1"
            />
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="btn btn-secondary py-1 px-3"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {dailyStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="card-body flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Jami qo&apos;ng&apos;iroqlar</p>
                <p className="text-2xl font-bold">{dailyStats.totalCalls}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Javob berilgan</p>
                <p className="text-2xl font-bold">{dailyStats.answeredCalls}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <PhoneMissed className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">O&apos;tkazib yuborilgan</p>
                <p className="text-2xl font-bold">{dailyStats.missedCalls}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">O&apos;rtacha vaqt</p>
                <p className="text-2xl font-bold">{formatDuration(dailyStats.avgDuration)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Operator table */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Operator statistikasi
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : operatorStats.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              Ma&apos;lumot topilmadi
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Operator</th>
                  <th className="text-center">Jami</th>
                  <th className="text-center">Javob berilgan</th>
                  <th className="text-center">O&apos;tkazib yuborilgan</th>
                  <th className="text-center">Javob %</th>
                  <th className="text-center">O&apos;rtacha vaqt</th>
                  <th className="text-center">Jami vaqt</th>
                </tr>
              </thead>
              <tbody>
                {operatorStats.map((stat) => (
                  <tr key={stat.operatorName}>
                    <td className="font-medium">{stat.operatorName}</td>
                    <td className="text-center">{stat.totalCalls}</td>
                    <td className="text-center text-green-600">{stat.answeredCalls}</td>
                    <td className="text-center text-red-600">{stat.missedCalls}</td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              stat.answerRate >= 90
                                ? 'bg-green-500'
                                : stat.answerRate >= 70
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${stat.answerRate}%` }}
                          />
                        </div>
                        <span className="text-sm">{stat.answerRate}%</span>
                      </div>
                    </td>
                    <td className="text-center">{formatDuration(stat.avgDuration)}</td>
                    <td className="text-center">{formatDuration(stat.totalDuration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Hourly chart */}
      {dailyStats && (
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Soatlik taqsimot
          </div>
          <div className="card-body">
            <div className="flex items-end gap-1 h-32">
              {Object.entries(dailyStats.byHour).map(([hour, count]) => {
                const maxCount = Math.max(...Object.values(dailyStats.byHour), 1);
                const height = (count / maxCount) * 100;
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all"
                      style={{ height: `${height}%` }}
                      title={`${hour}:00 - ${count} ta qo'ng'iroq`}
                    />
                    <span className="text-xs text-gray-500 mt-1">
                      {parseInt(hour) % 3 === 0 ? `${hour}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
