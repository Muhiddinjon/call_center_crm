'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import type { CallLog } from '@/lib/types';
import { formatPhone } from '@/lib/utils';
import { REGIONS, TOPICS } from '@/lib/types';

interface CallFormProps {
  call: CallLog | null;
  operatorName: string;
  onSaved: () => void;
}

export function CallForm({ call, operatorName, onSaved }: CallFormProps) {
  const [loading, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    callerType: '',
    region: '',
    topic: '',
    notes: '',
  });

  useEffect(() => {
    if (call) {
      setFormData({
        callerType: call.callerType || (call.isDriver ? 'driver' : ''),
        region: call.region || '',
        topic: call.topic || '',
        notes: call.notes || '',
      });
    } else {
      setFormData({
        callerType: '',
        region: '',
        topic: '',
        notes: '',
      });
    }
  }, [call]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!call) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/calls/${call.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          operatorName,
        }),
      });

      if (response.ok) {
        onSaved();
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!call) {
    return (
      <div className="card">
        <div className="card-header">Qo'ng'iroq ma'lumotlari</div>
        <div className="card-body text-center text-gray-500 py-12">
          <p>Qo'ng'iroqni tanlang yoki yangi qo'ng'iroq kuting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span>Qo'ng'iroq ma'lumotlari</span>
        {call.isDriver && (
          <span className="badge badge-yellow">Driver</span>
        )}
      </div>
      <form onSubmit={handleSubmit} className="card-body space-y-4">
        {/* Phone Number */}
        <div>
          <label className="form-label">Telefon raqam</label>
          <input
            type="text"
            value={formatPhone(call.phoneNumber)}
            readOnly
            className="form-input bg-gray-50"
          />
        </div>

        {/* Driver Info */}
        {call.isDriver && call.driverName && (
          <div className="p-3 bg-yellow-50 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Driver ID:</span>
              <span className="font-medium">{call.driverId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Ism:</span>
              <span className="font-medium">{call.driverName}</span>
            </div>
            {call.driverCar && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Mashina:</span>
                <span className="font-medium">{call.driverCar}</span>
              </div>
            )}
            {call.managerNumber && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Manager:</span>
                <span className="font-medium">{call.managerNumber}</span>
              </div>
            )}
          </div>
        )}

        {/* Caller Type */}
        <div>
          <label className="form-label">Kim qo'ng'iroq qildi</label>
          <select
            value={formData.callerType}
            onChange={(e) => setFormData({ ...formData, callerType: e.target.value })}
            className="form-select"
          >
            <option value="">Tanlang...</option>
            <option value="driver">Driver</option>
            <option value="client">Mijoz</option>
          </select>
        </div>

        {/* Region */}
        <div>
          <label className="form-label">Viloyat</label>
          <select
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
            className="form-select"
          >
            <option value="">Tanlang...</option>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        {/* Topic */}
        <div>
          <label className="form-label">Suhbat mavzusi</label>
          <select
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            className="form-select"
          >
            <option value="">Tanlang...</option>
            {TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>

        {/* Operator */}
        <div>
          <label className="form-label">Operator</label>
          <input
            type="text"
            value={operatorName}
            readOnly
            className="form-input bg-gray-50"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="form-label">Izoh</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="form-textarea h-24"
            placeholder="Qo'shimcha ma'lumotlar..."
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full btn btn-primary flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saqlanmoqda...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Saqlash
            </>
          )}
        </button>
      </form>
    </div>
  );
}
