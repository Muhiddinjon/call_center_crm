'use client';

import { useState, useEffect } from 'react';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Users,
  Car,
  Clock,
  TrendingUp,
} from 'lucide-react';
import type { ReportStats } from '@/lib/types';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    fetch(`/api/admin/reports?dateFrom=${today.toISOString()}`)
      .then((res) => res.json())
      .then((data) => {
        setStats(data.stats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      label: 'Jami qo\'ng\'iroqlar',
      value: stats?.totalCalls || 0,
      icon: Phone,
      color: 'blue',
    },
    {
      label: 'Kiruvchi',
      value: stats?.incomingCalls || 0,
      icon: PhoneIncoming,
      color: 'green',
    },
    {
      label: 'Chiquvchi',
      value: stats?.outgoingCalls || 0,
      icon: PhoneOutgoing,
      color: 'purple',
    },
    {
      label: 'Driver qo\'ng\'iroqlari',
      value: stats?.driverCalls || 0,
      icon: Car,
      color: 'yellow',
    },
    {
      label: 'Mijoz qo\'ng\'iroqlari',
      value: stats?.clientCalls || 0,
      icon: Users,
      color: 'pink',
    },
    {
      label: 'O\'rtacha davomiylik',
      value: stats ? `${Math.floor(stats.avgDuration / 60)}:${Math.floor(stats.avgDuration % 60).toString().padStart(2, '0')}` : '0:00',
      icon: Clock,
      color: 'indigo',
    },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    pink: 'bg-pink-50 text-pink-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600">Bugungi statistika</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="card">
            <div className="card-body flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[card.color]}`}>
                <card.icon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {loading ? '...' : card.value}
                </div>
                <div className="text-sm text-gray-500">{card.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Region breakdown */}
      {stats && Object.keys(stats.byRegion).length > 0 && (
        <div className="card mb-8">
          <div className="card-header flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Viloyatlar bo'yicha
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(stats.byRegion)
                .sort((a, b) => b[1] - a[1])
                .map(([region, count]) => (
                  <div key={region} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{region}</span>
                    <span className="font-bold text-gray-800">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Operator breakdown */}
      {stats && Object.keys(stats.byOperator).length > 0 && (
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Operatorlar bo'yicha
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(stats.byOperator)
                .sort((a, b) => b[1] - a[1])
                .map(([operator, count]) => (
                  <div key={operator} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{operator}</span>
                    <span className="font-bold text-gray-800">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
