'use client';

import { useState } from 'react';
import { X, Loader2, Calendar, Clock, User, FileText } from 'lucide-react';
import type { Shift, UserResponse } from '@/lib/types';

interface ShiftFormProps {
  shift?: Shift | null;
  users: UserResponse[];
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function ShiftForm({ shift, users, defaultDate, onClose, onSaved }: ShiftFormProps) {
  const isEdit = !!shift;
  const today = new Date().toISOString().split('T')[0];

  const [userId, setUserId] = useState(shift?.userId || '');
  const [date, setDate] = useState(shift?.date || defaultDate || today);
  const [startTime, setStartTime] = useState(shift?.startTime || '09:00');
  const [endTime, setEndTime] = useState(shift?.endTime || '18:00');
  const [notes, setNotes] = useState(shift?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Bulk mode state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!userId) {
      setError('Hodimni tanlang');
      return;
    }

    if (bulkMode && selectedDates.length === 0) {
      setError('Kamida bitta sana tanlang');
      return;
    }

    setSaving(true);

    try {
      if (bulkMode) {
        // Bulk create
        const res = await fetch('/api/admin/shifts/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            dates: selectedDates,
            startTime,
            endTime,
            notes,
            skipConflicts: true,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Xatolik yuz berdi');
        }

        if (data.errors?.length > 0) {
          setError(`${data.summary.created} ta yaratildi, ${data.errors.length} ta xatolik`);
        }
      } else if (isEdit && shift) {
        // Update existing shift
        const res = await fetch(`/api/admin/shifts/${shift.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, startTime, endTime, notes }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Xatolik yuz berdi');
        }
      } else {
        // Create single shift
        const res = await fetch('/api/admin/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, date, startTime, endTime, notes }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Xatolik yuz berdi');
        }
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleDateToggle = (dateStr: string) => {
    setSelectedDates(prev =>
      prev.includes(dateStr)
        ? prev.filter(d => d !== dateStr)
        : [...prev, dateStr]
    );
  };

  // Generate dates for bulk selection (next 30 days)
  const bulkDates = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Smenani tahrirlash' : 'Yangi smena'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Bulk mode toggle */}
          {!isEdit && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="bulkMode"
                checked={bulkMode}
                onChange={(e) => setBulkMode(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="bulkMode" className="text-sm">
                Ko'p kunlar uchun smena qo'shish
              </label>
            </div>
          )}

          {/* User select */}
          <div>
            <label className="form-label flex items-center gap-2">
              <User className="w-4 h-4" />
              Hodim *
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="form-select"
              disabled={isEdit}
              required
            >
              <option value="">Tanlang...</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.fullName || user.username}
                </option>
              ))}
            </select>
          </div>

          {/* Date(s) */}
          {bulkMode ? (
            <div>
              <label className="form-label flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Sanalar * ({selectedDates.length} ta tanlandi)
              </label>
              <div className="grid grid-cols-5 gap-1 max-h-48 overflow-y-auto p-2 border rounded-lg">
                {bulkDates.map(dateStr => (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => handleDateToggle(dateStr)}
                    className={`p-2 text-xs rounded ${
                      selectedDates.includes(dateStr)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {dateStr.slice(5)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="form-label flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Sana *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
                required
              />
            </div>
          )}

          {/* Time range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Boshlanish *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="form-label flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Tugash *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="form-input"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="form-label flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Izoh
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-textarea"
              rows={2}
              placeholder="Qo'shimcha izoh..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Saqlash' : bulkMode ? `${selectedDates.length} ta qo'shish` : 'Qo\'shish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
