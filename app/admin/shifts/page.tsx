'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Users,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, isToday } from 'date-fns';
import { uz } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Shift, UserResponse } from '@/lib/types';
import ShiftForm from '@/components/admin/shifts/ShiftForm';
import ShiftDayModal from '@/components/admin/shifts/ShiftDayModal';

interface CalendarData {
  month: string;
  shifts: Record<string, Shift[]>;
  summary: {
    totalShifts: number;
    totalHours: number;
    operatorCounts: Record<string, number>;
    operatorNames: Record<string, string>;
    daysWithShifts: number;
  };
}

export default function ShiftsPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const monthStr = format(currentMonth, 'yyyy-MM');
      let url = `/api/admin/shifts/calendar?month=${monthStr}`;
      if (selectedUserId) {
        url += `&userId=${selectedUserId}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      setCalendarData(data);
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.filter((u: UserResponse) => u.isActive));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchCalendarData();
  }, [currentMonth, selectedUserId]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Pad days to start from Monday
  const firstDayOfMonth = startOfMonth(currentMonth);
  const startPadding = (firstDayOfMonth.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
  const paddedDays = [
    ...Array(startPadding).fill(null),
    ...days,
  ];

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
  };

  const handleShiftSaved = () => {
    setShowAddForm(false);
    setSelectedShift(null);
    fetchCalendarData();
  };

  const operators = users.filter(u => !u.isAdmin);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Smenalar</h1>
          <p className="text-gray-500">Hodimlar ish jadvalini boshqaring</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Smena qo'shish
        </button>
      </div>

      {/* Summary Cards */}
      {calendarData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{calendarData.summary.totalShifts}</div>
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
                <div className="text-2xl font-bold">{calendarData.summary.totalHours}</div>
                <div className="text-sm text-gray-500">Jami soatlar</div>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{Object.keys(calendarData.summary.operatorCounts).length}</div>
                <div className="text-sm text-gray-500">Hodimlar soni</div>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{calendarData.summary.daysWithShifts}</div>
                <div className="text-sm text-gray-500">Smenali kunlar</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-lg font-medium min-w-[180px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: uz })}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1" />

            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="form-select w-48"
            >
              <option value="">Barcha hodimlar</option>
              {operators.map(user => (
                <option key={user.id} value={user.id}>
                  {user.fullName || user.username}
                </option>
              ))}
            </select>

            <button
              onClick={fetchCalendarData}
              className="btn btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Yangilash
            </button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b">
                {['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map(day => (
                  <div
                    key={day}
                    className="p-3 text-center text-sm font-medium text-gray-500 border-r last:border-r-0"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {paddedDays.map((day, index) => {
                  if (!day) {
                    return <div key={`pad-${index}`} className="min-h-32 bg-gray-50 border-r border-b" />;
                  }

                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayShifts = calendarData?.shifts[dateStr] || [];
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isTodayDate = isToday(day);

                  return (
                    <div
                      key={dateStr}
                      className={cn(
                        'min-h-32 p-2 border-r border-b cursor-pointer hover:bg-gray-50 transition-colors',
                        !isCurrentMonth && 'bg-gray-50 text-gray-400',
                        isTodayDate && 'bg-blue-50'
                      )}
                      onClick={() => handleDayClick(dateStr)}
                    >
                      <div className={cn(
                        'font-medium text-sm mb-1',
                        isTodayDate && 'text-blue-600'
                      )}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayShifts.slice(0, 3).map(shift => (
                          <div
                            key={shift.id}
                            className="text-xs p-1 rounded bg-blue-100 text-blue-800 truncate"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedShift(shift);
                            }}
                          >
                            {shift.operatorName.split(' ')[0]}: {shift.startTime}-{shift.endTime}
                          </div>
                        ))}
                        {dayShifts.length > 3 && (
                          <div className="text-xs text-gray-500 pl-1">
                            +{dayShifts.length - 3} ta
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Shift Modal */}
      {(showAddForm || selectedShift) && (
        <ShiftForm
          shift={selectedShift}
          users={operators}
          defaultDate={selectedDate || undefined}
          onClose={() => {
            setShowAddForm(false);
            setSelectedShift(null);
          }}
          onSaved={handleShiftSaved}
        />
      )}

      {/* Day Detail Modal */}
      {selectedDate && !showAddForm && !selectedShift && (
        <ShiftDayModal
          date={selectedDate}
          shifts={calendarData?.shifts[selectedDate] || []}
          onClose={() => setSelectedDate(null)}
          onAddShift={() => {
            setShowAddForm(true);
          }}
          onEditShift={(shift) => {
            setSelectedShift(shift);
          }}
          onRefresh={fetchCalendarData}
        />
      )}
    </div>
  );
}
