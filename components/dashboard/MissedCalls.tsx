'use client';

import { useState, useEffect } from 'react';
import { PhoneMissed, PhoneOutgoing, Loader2, Check, RefreshCw, User } from 'lucide-react';
import { format } from 'date-fns';
import type { MissedCall } from '@/lib/types';
import { formatPhone, normalizePhone } from '@/lib/utils';

interface MissedCallsProps {
  operatorName: string;
  onCallback?: (phoneNumber: string) => void;
}

export function MissedCalls({ operatorName, onCallback }: MissedCallsProps) {
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchMissedCalls = async () => {
    try {
      const response = await fetch('/api/calls/missed?unhandled=true');
      if (response.ok) {
        const data = await response.json();
        setMissedCalls(data);
      }
    } catch (error) {
      console.error('Fetch missed calls error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissedCalls();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMissedCalls, 30000);
    return () => clearInterval(interval);
  }, []);

  // Make call via MicroSIP
  const makeCall = (phone: string) => {
    const normalized = normalizePhone(phone).replace('+', '');
    window.location.href = `sip:${normalized}`;
  };

  const handleCallback = async (call: MissedCall) => {
    setProcessingId(call.id);
    try {
      // Mark as callback
      await fetch('/api/calls/missed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: call.id,
          action: 'callback',
          operatorName,
        }),
      });

      // Make the call
      makeCall(call.phoneNumber);

      // Notify parent if callback provided
      if (onCallback) {
        onCallback(call.phoneNumber);
      }

      // Refresh list
      await fetchMissedCalls();
    } catch (error) {
      console.error('Callback error:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDismiss = async (call: MissedCall) => {
    setProcessingId(call.id);
    try {
      await fetch('/api/calls/missed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: call.id,
          action: 'remove',
        }),
      });
      await fetchMissedCalls();
    } catch (error) {
      console.error('Dismiss error:', error);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <PhoneMissed className="w-5 h-5 text-red-600" />
          O&apos;tkazib yuborilgan qo&apos;ng&apos;iroqlar
        </div>
        <div className="card-body flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PhoneMissed className="w-5 h-5 text-red-600" />
          O&apos;tkazib yuborilgan qo&apos;ng&apos;iroqlar
          {missedCalls.length > 0 && (
            <span className="badge badge-red">{missedCalls.length}</span>
          )}
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchMissedCalls();
          }}
          className="p-1 hover:bg-gray-100 rounded"
          title="Yangilash"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <div className="card-body p-0">
        {missedCalls.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <PhoneMissed className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>O&apos;tkazib yuborilgan qo&apos;ng&apos;iroqlar yo&apos;q</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto divide-y">
            {missedCalls.map((call) => (
              <div
                key={call.id}
                className="p-3 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatPhone(call.phoneNumber)}
                    </span>
                    {call.isDriver && (
                      <span className="badge badge-yellow text-xs">Driver</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {(call.contactName || call.driverName) && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {call.contactName || call.driverName}
                      </span>
                    )}
                    <span>{format(new Date(call.callStart), 'HH:mm')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCallback(call)}
                    disabled={processingId === call.id}
                    className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                    title="Qayta qo'ng'iroq qilish"
                  >
                    {processingId === call.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <PhoneOutgoing className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDismiss(call)}
                    disabled={processingId === call.id}
                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    title="O'chirish"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
