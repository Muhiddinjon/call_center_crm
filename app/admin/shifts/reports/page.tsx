'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  ChevronLeft,
  Clock,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  RefreshCw,
  User,
  Calendar,
  Download,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import type { ShiftReport, UserResponse } from '@/lib/types';

interface ReportsData {
  reports: ShiftReport[];
  summary: {
    totalOperators: number;
    totalShifts: number;
    totalHours: number;
    totalCalls: number;
    totalAnswered: number;
    totalMissed: number;
    avgAnswerRate: number;
  };
  period: {
    dateFrom: string;
    dateTo: string;
  };
}

export default function ShiftReportsPage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [data, setData] = useState<ReportsData | null>(null);
  const [singleReport, setSingleReport] = useState<ShiftReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.filter((u: UserResponse) => u.isActive && !u.isAdmin));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/shifts/reports?dateFrom=${dateFrom}&dateTo=${dateTo}`;
      if (selectedUserId) {
        url += `&userId=${selectedUserId}`;
      }

      const res = await fetch(url);
      const responseData = await res.json();

      if (selectedUserId) {
        setSingleReport(responseData as ShiftReport);
        setData(null);
      } else {
        setData(responseData as ReportsData);
        setSingleReport(null);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [dateFrom, dateTo, selectedUserId]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const operators = users;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/shifts"
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Smena hisobotlari</h1>
          <p className="text-gray-500">Hodimlar ish faoliyati bo'yicha statistika</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="form-label">Boshlanish</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Tugash</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Hodim</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="form-select"
              >
                <option value="">Barcha hodimlar</option>
                {operators.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.fullName || user.username}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchReports}
              className="btn btn-primary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Yangilash
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : singleReport ? (
        /* Single user report */
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{singleReport.totalShifts}</div>
                  <div className="text-sm text-gray-500">Jami smenalar</div>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{Math.round(singleReport.totalHoursScheduled)}</div>
                  <div className="text-sm text-gray-500">Ish soatlari</div>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Phone className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{singleReport.callsDuringShift}</div>
                  <div className="text-sm text-gray-500">Qo'ng'iroqlar</div>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{singleReport.answerRate}%</div>
                  <div className="text-sm text-gray-500">Javob berish</div>
                </div>
              </div>
            </div>
          </div>

          {/* Shift details */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">{singleReport.operatorName} - Smenalar</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Vaqt</th>
                    <th>Soatlar</th>
                    <th>Qo'ng'iroqlar</th>
                    <th>Javob berilgan</th>
                    <th>O'tkazib yuborilgan</th>
                  </tr>
                </thead>
                <tbody>
                  {singleReport.shifts.map(shift => (
                    <tr key={shift.shiftId}>
                      <td>{shift.date}</td>
                      <td>{shift.startTime} - {shift.endTime}</td>
                      <td>{shift.hoursScheduled} soat</td>
                      <td>{shift.callsDuringShift}</td>
                      <td className="text-green-600">{shift.answeredCalls}</td>
                      <td className="text-red-600">{shift.missedCalls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : data ? (
        /* All users report */
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{data.summary.totalOperators}</div>
                  <div className="text-sm text-gray-500">Hodimlar</div>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{data.summary.totalShifts}</div>
                  <div className="text-sm text-gray-500">Jami smenalar</div>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{Math.round(data.summary.totalHours)}</div>
                  <div className="text-sm text-gray-500">Jami soatlar</div>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{data.summary.avgAnswerRate}%</div>
                  <div className="text-sm text-gray-500">O'rtacha javob</div>
                </div>
              </div>
            </div>
          </div>

          {/* Call stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{data.summary.totalCalls}</div>
                  <div className="text-sm text-gray-500">Jami qo'ng'iroqlar</div>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <PhoneIncoming className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{data.summary.totalAnswered}</div>
                  <div className="text-sm text-gray-500">Javob berilgan</div>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <PhoneMissed className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{data.summary.totalMissed}</div>
                  <div className="text-sm text-gray-500">O'tkazib yuborilgan</div>
                </div>
              </div>
            </div>
          </div>

          {/* Reports table */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Hodimlar bo'yicha</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Hodim</th>
                    <th>Smenalar</th>
                    <th>Soatlar</th>
                    <th>Qo'ng'iroqlar</th>
                    <th>Javob berilgan</th>
                    <th>O'tkazib yuborilgan</th>
                    <th>Javob %</th>
                    <th>O'rtacha vaqt</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reports.map(report => (
                    <tr key={report.userId}>
                      <td>
                        <button
                          onClick={() => setSelectedUserId(report.userId)}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {report.operatorName}
                        </button>
                      </td>
                      <td>{report.totalShifts}</td>
                      <td>{Math.round(report.totalHoursScheduled)}</td>
                      <td>{report.callsDuringShift}</td>
                      <td className="text-green-600">{report.answeredCalls}</td>
                      <td className="text-red-600">{report.missedCalls}</td>
                      <td>
                        <span className={`badge ${
                          report.answerRate >= 90 ? 'badge-green' :
                          report.answerRate >= 70 ? 'badge-yellow' :
                          'badge-red'
                        }`}>
                          {report.answerRate}%
                        </span>
                      </td>
                      <td>{formatDuration(report.avgCallDuration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500">
          Ma'lumot topilmadi
        </div>
      )}
    </div>
  );
}
