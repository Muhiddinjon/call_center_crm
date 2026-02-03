'use client';

import { useState, useEffect } from 'react';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneOff,
  Clock,
  Users,
  RefreshCw,
} from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface BinotelStatsData {
  onlineCalls: number;
  todayIncoming: number;
  todayOutgoing: number;
  todayAnswered: number;
  todayMissed: number;
  avgDuration: number;
  employeesOnline: number;
  employeesTotal: number;
}

export function BinotelStats() {
  const [stats, setStats] = useState<BinotelStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/binotel/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError('Statistika yuklanmadi');
      console.error('Binotel stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Binotel statistikasi
        </div>
        <div className="card-body flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Binotel statistikasi
        </div>
        <div className="card-body text-center py-4">
          <p className="text-red-500 text-sm">{error}</p>
          <button
            onClick={fetchStats}
            className="btn btn-secondary mt-2 text-sm"
          >
            Qayta yuklash
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Binotel statistikasi
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="Yangilash"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="card-body">
        <div className="grid grid-cols-2 gap-3">
          {/* Online calls */}
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Phone className="w-4 h-4" />
              <span className="text-xs font-medium">Online</span>
            </div>
            <div className="text-2xl font-bold text-green-700">
              {stats.onlineCalls}
            </div>
          </div>

          {/* Employees online */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">Xodimlar</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {stats.employeesOnline}/{stats.employeesTotal}
            </div>
          </div>

          {/* Today incoming */}
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <PhoneIncoming className="w-4 h-4" />
              <span className="text-xs font-medium">Kiruvchi</span>
            </div>
            <div className="text-2xl font-bold text-purple-700">
              {stats.todayIncoming}
            </div>
          </div>

          {/* Today outgoing */}
          <div className="bg-cyan-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-cyan-600 mb-1">
              <PhoneOutgoing className="w-4 h-4" />
              <span className="text-xs font-medium">Chiquvchi</span>
            </div>
            <div className="text-2xl font-bold text-cyan-700">
              {stats.todayOutgoing}
            </div>
          </div>

          {/* Answered */}
          <div className="bg-emerald-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <Phone className="w-4 h-4" />
              <span className="text-xs font-medium">Javob</span>
            </div>
            <div className="text-2xl font-bold text-emerald-700">
              {stats.todayAnswered}
            </div>
          </div>

          {/* Missed */}
          <div className="bg-red-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <PhoneOff className="w-4 h-4" />
              <span className="text-xs font-medium">O'tkazib yuborilgan</span>
            </div>
            <div className="text-2xl font-bold text-red-700">
              {stats.todayMissed}
            </div>
          </div>
        </div>

        {/* Average duration */}
        <div className="mt-3 flex items-center justify-center gap-2 text-gray-600 bg-gray-50 rounded-lg py-2">
          <Clock className="w-4 h-4" />
          <span className="text-sm">O'rtacha davomiylik:</span>
          <span className="font-semibold">{formatDuration(stats.avgDuration)}</span>
        </div>
      </div>
    </div>
  );
}
