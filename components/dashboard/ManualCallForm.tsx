'use client';

import { useState } from 'react';
import { Plus, Search, Phone, PhoneOutgoing, Loader2, History } from 'lucide-react';
import { format } from 'date-fns';
import type { CallLog, LookupResult } from '@/lib/types';
import { formatPhone, normalizePhone } from '@/lib/utils';

interface CallHistoryData {
  calls: CallLog[];
  contactInfo: {
    phoneNumber: string;
    isDriver: boolean;
    driverInfo?: {
      driverId?: string;
      driverName?: string;
      driverCar?: string;
      driverRating?: string;
      driverStatus?: string;
      managerNumber?: string;
    };
    totalCalls: number;
    lastCall?: number;
  };
}

interface ManualCallFormProps {
  onCallCreated: (call: CallLog) => void;
}

export function ManualCallForm({ onCallCreated }: ManualCallFormProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callType, setCallType] = useState<'incoming' | 'outgoing'>('incoming');
  const [loading, setLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [callHistory, setCallHistory] = useState<CallHistoryData | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleLookup = async () => {
    if (!phoneNumber || phoneNumber.length < 9) return;

    setLookupLoading(true);
    try {
      // Lookup driver/client info
      const lookupResponse = await fetch(`/api/calls/lookup/${encodeURIComponent(phoneNumber)}`);
      if (lookupResponse.ok) {
        const data = await lookupResponse.json();
        setLookupResult(data);
      }

      // Get call history
      const historyResponse = await fetch(`/api/calls/history?phone=${encodeURIComponent(phoneNumber)}`);
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setCallHistory(historyData);
      }
    } catch (error) {
      console.error('Lookup error:', error);
    } finally {
      setLookupLoading(false);
    }
  };

  // Make outgoing call via MicroSIP (sip: protocol)
  const makeCall = (phone: string) => {
    const normalized = normalizePhone(phone).replace('+', '');
    window.location.href = `sip:${normalized}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;

    setLoading(true);
    try {
      const response = await fetch('/api/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          callType,
        }),
      });

      if (response.ok) {
        const call = await response.json();
        onCallCreated(call);

        // If outgoing call, auto-dial via MicroSIP
        if (callType === 'outgoing') {
          makeCall(phoneNumber);
        }

        setPhoneNumber('');
        setLookupResult(null);
        setCallHistory(null);
        setShowHistory(false);
      }
    } catch (error) {
      console.error('Create call error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header flex items-center gap-2">
        <Plus className="w-5 h-5 text-blue-600" />
        Qo&apos;ng&apos;iroq qo&apos;shish
      </div>
      <form onSubmit={handleSubmit} className="card-body space-y-4">
        {/* Phone number with lookup */}
        <div>
          <label className="form-label">Telefon raqam</label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                setLookupResult(null);
                setCallHistory(null);
              }}
              className="form-input flex-1"
              placeholder="+998901234567"
              required
            />
            <button
              type="button"
              onClick={handleLookup}
              disabled={lookupLoading || phoneNumber.length < 9}
              className="btn btn-secondary px-3"
              title="Qidirish"
            >
              {lookupLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Lookup result */}
        {lookupResult && (
          <div className="text-sm">
            {lookupResult.driverInfo?.isDriver && (
              <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                <span className="font-medium text-yellow-800">Driver: </span>
                {lookupResult.driverInfo.driverName || lookupResult.driverInfo.driverId}
                {lookupResult.driverInfo.driverCar && (
                  <span className="text-yellow-600 ml-2">({lookupResult.driverInfo.driverCar})</span>
                )}
              </div>
            )}
            {lookupResult.clientInfo?.isClient && (
              <div className="p-2 bg-blue-50 rounded border border-blue-200 mt-2">
                <span className="font-medium text-blue-800">Mijoz: </span>
                {lookupResult.clientInfo.clientName || lookupResult.clientInfo.clientId}
              </div>
            )}
            {!lookupResult.driverInfo?.isDriver && !lookupResult.clientInfo?.isClient && (
              <div className="p-2 bg-gray-50 rounded border border-gray-200">
                <span className="text-gray-600">Ma&apos;lumot topilmadi</span>
              </div>
            )}
          </div>
        )}

        {/* Call history toggle */}
        {callHistory && callHistory.calls.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
            >
              <History className="w-4 h-4" />
              Qo&apos;ng&apos;iroqlar tarixi ({callHistory.calls.length} ta)
            </button>

            {showHistory && (
              <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg">
                {callHistory.calls.slice(0, 10).map((call) => (
                  <div
                    key={call.id}
                    className="p-2 border-b last:border-b-0 text-sm hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">
                        {format(new Date(call.callStart), 'dd.MM.yyyy HH:mm')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        call.callType === 'incoming'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {call.callType === 'incoming' ? 'Kiruvchi' : 'Chiquvchi'}
                      </span>
                    </div>
                    {call.notes && (
                      <p className="text-gray-600 mt-1 text-xs">{call.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Call type */}
        <div>
          <label className="form-label">Qo&apos;ng&apos;iroq turi</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCallType('incoming')}
              className={`flex-1 py-2 px-3 rounded-lg border-2 transition-colors ${
                callType === 'incoming'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              Kiruvchi
            </button>
            <button
              type="button"
              onClick={() => setCallType('outgoing')}
              className={`flex-1 py-2 px-3 rounded-lg border-2 transition-colors ${
                callType === 'outgoing'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              Chiquvchi
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !phoneNumber}
          className="w-full btn btn-primary flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Qo&apos;shilmoqda...
            </>
          ) : callType === 'outgoing' ? (
            <>
              <PhoneOutgoing className="w-5 h-5" />
              Qo&apos;shish va qo&apos;ng&apos;iroq qilish
            </>
          ) : (
            <>
              <Phone className="w-5 h-5" />
              Qo&apos;shish
            </>
          )}
        </button>
      </form>
    </div>
  );
}
