'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Clock, User, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import type { Shift, ShiftCoverage } from '@/lib/types';

interface ShiftDayModalProps {
  date: string;
  shifts: Shift[];
  onClose: () => void;
  onAddShift: () => void;
  onEditShift: (shift: Shift) => void;
  onRefresh: () => void;
}

export default function ShiftDayModal({
  date,
  shifts,
  onClose,
  onAddShift,
  onEditShift,
  onRefresh,
}: ShiftDayModalProps) {
  const [coverage, setCoverage] = useState<ShiftCoverage[] | null>(null);
  const [loadingCoverage, setLoadingCoverage] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchCoverage();
  }, [date]);

  const fetchCoverage = async () => {
    setLoadingCoverage(true);
    try {
      const res = await fetch(`/api/admin/shifts/coverage?date=${date}`);
      const data = await res.json();
      setCoverage(data.hourly);
    } catch (error) {
      console.error('Failed to fetch coverage:', error);
    } finally {
      setLoadingCoverage(false);
    }
  };

  const handleDelete = async (shiftId: string) => {
    if (!confirm('Bu smenani o\'chirishni xohlaysizmi?')) return;

    setDeleting(shiftId);
    try {
      const res = await fetch(`/api/admin/shifts/${shiftId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to delete shift:', error);
    } finally {
      setDeleting(null);
    }
  };

  const dateObj = new Date(date + 'T00:00:00');
  const formattedDate = format(dateObj, 'd MMMM yyyy, EEEE', { locale: uz });

  // Calculate coverage stats
  const coveredHours = coverage?.filter(h => h.coverageStatus === 'covered').length || 0;
  const partialHours = coverage?.filter(h => h.coverageStatus === 'partial').length || 0;
  const uncoveredHours = coverage?.filter(h => h.coverageStatus === 'uncovered').length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-semibold">{formattedDate}</h2>
            <p className="text-sm text-gray-500">{shifts.length} ta smena</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onAddShift}
              className="btn btn-primary btn-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Qo'shish
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Shifts list */}
          <div>
            <h3 className="font-medium mb-3">Smenalar</h3>
            {shifts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Bu kunda smena yo'q
              </div>
            ) : (
              <div className="space-y-2">
                {shifts.map(shift => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{shift.operatorName}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {shift.startTime} - {shift.endTime}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEditShift(shift)}
                        className="p-2 hover:bg-gray-200 rounded-lg"
                        title="Tahrirlash"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(shift.id)}
                        disabled={deleting === shift.id}
                        className="p-2 hover:bg-red-100 text-red-600 rounded-lg"
                        title="O'chirish"
                      >
                        {deleting === shift.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coverage chart */}
          <div>
            <h3 className="font-medium mb-3">Soatlik qoplama</h3>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">{coveredHours} soat to'liq</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm">{partialHours} soat qisman</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm">{uncoveredHours} soat bo'sh</span>
              </div>
            </div>

            {loadingCoverage ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : coverage ? (
              <div className="flex gap-0.5">
                {coverage.map((hour) => (
                  <div
                    key={hour.hour}
                    className="flex-1 relative group"
                    title={`${hour.hour}:00 - ${hour.operators.map(o => o.operatorName).join(', ') || 'Hech kim'}`}
                  >
                    <div
                      className={`h-8 rounded-sm ${
                        hour.coverageStatus === 'covered'
                          ? 'bg-green-500'
                          : hour.coverageStatus === 'partial'
                          ? 'bg-yellow-500'
                          : 'bg-gray-200'
                      }`}
                    />
                    {hour.hour % 6 === 0 && (
                      <div className="text-xs text-gray-500 text-center mt-1">
                        {hour.hour}
                      </div>
                    )}

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        {hour.hour}:00 - {hour.operators.length > 0 ? hour.operators.map(o => o.operatorName).join(', ') : 'Bo\'sh'}
                        {hour.callCount > 0 && (
                          <div className="text-gray-300">
                            {hour.callCount} qo'ng'iroq ({hour.missedCount} missed)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
