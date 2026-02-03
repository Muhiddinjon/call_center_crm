'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import type { CallLog, Topic } from '@/lib/types';
import { formatPhone } from '@/lib/utils';
import { REGIONS, DEFAULT_TOPICS } from '@/lib/types';

interface CallFormProps {
  call: CallLog | null;
  operatorName: string;
  onSaved: () => void;
}

export function CallForm({ call, operatorName, onSaved }: CallFormProps) {
  const [loading, setSaving] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [formData, setFormData] = useState({
    callerType: '',
    region: '',
    topic: '',
    notes: '',
  });

  // Fetch topics on mount
  useEffect(() => {
    fetch('/api/admin/topics')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTopics(data.filter((t: Topic) => t.isActive));
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (call) {
      // Redis dan kelganda isDriver string "true" bo'lishi mumkin
      const isDriver = call.isDriver === true || call.isDriver === 'true';
      setFormData({
        callerType: call.callerType || (isDriver ? 'driver' : ''),
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

  // Check if all required fields are filled
  const isFormValid = formData.callerType && formData.region && formData.topic;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!call) return;

    // Validate required fields
    if (!formData.callerType || !formData.region || !formData.topic) {
      alert('Iltimos, barcha majburiy maydonlarni to\'ldiring');
      return;
    }

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

  // Redis dan kelganda isDriver string "true" bo'lishi mumkin
  const isDriverCall = call.isDriver === true || call.isDriver === 'true';

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span>Qo'ng'iroq ma'lumotlari</span>
        {isDriverCall && (
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

        {/* Driver Info - shows if driver or has RM */}
        {(isDriverCall || call.managerNumber) && (
          <div className="p-3 bg-yellow-50 rounded-lg space-y-2">
            {call.driverId && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Driver ID:</span>
                <span className="font-medium">{call.driverId}</span>
              </div>
            )}
            {call.driverName && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Ism:</span>
                <span className="font-medium">{call.driverName}</span>
              </div>
            )}
            {call.driverCar && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Mashina:</span>
                <span className="font-medium">{call.driverCar}</span>
              </div>
            )}
            {call.managerNumber && (
              <div className="flex justify-between items-center bg-yellow-100 -mx-3 -mb-3 mt-2 px-3 py-2 rounded-b-lg">
                <span className="text-sm font-medium text-yellow-800">RM (Region Manager):</span>
                <span className="font-bold text-yellow-900 text-lg">{call.managerNumber}</span>
              </div>
            )}
          </div>
        )}

        {/* Caller Type */}
        <div>
          <label className="form-label">
            Kim qo&apos;ng&apos;iroq qildi <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.callerType}
            onChange={(e) => setFormData({ ...formData, callerType: e.target.value })}
            className={`form-select ${!formData.callerType ? 'border-red-300' : ''}`}
            required
          >
            <option value="">Tanlang...</option>
            <option value="driver">Driver</option>
            <option value="client">Mijoz</option>
          </select>
        </div>

        {/* Region */}
        <div>
          <label className="form-label">
            Viloyat <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
            className={`form-select ${!formData.region ? 'border-red-300' : ''}`}
            required
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
          <label className="form-label">
            Suhbat mavzusi <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            className={`form-select ${!formData.topic ? 'border-red-300' : ''}`}
            required
          >
            <option value="">Tanlang...</option>
            {topics.length > 0
              ? topics.map((topic) => (
                  <option key={topic.id} value={topic.name}>
                    {topic.name}
                  </option>
                ))
              : DEFAULT_TOPICS.map((topic) => (
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
          disabled={loading || !isFormValid}
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
        {!isFormValid && (
          <p className="text-xs text-red-500 text-center">
            * belgilangan maydonlarni to&apos;ldiring
          </p>
        )}
      </form>
    </div>
  );
}
