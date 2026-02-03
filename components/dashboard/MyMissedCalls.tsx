'use client';

import { useState, useEffect } from 'react';
import { PhoneMissed, PhoneOutgoing, Loader2, Check, RefreshCw, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { MissedCall } from '@/lib/types';
import { formatPhone, normalizePhone } from '@/lib/utils';

interface MyMissedCallsProps {
  userId: string;
  operatorName: string;
  onCallback?: (phoneNumber: string) => void;
}

export function MyMissedCalls({ userId, operatorName, onCallback }: MyMissedCallsProps) {
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchMyMissedCalls = async () => {
    try {
      const response = await fetch('/api/calls/missed?my=true');
      if (response.ok) {
        const data = await response.json();
        // Filter to show only assigned (not resolved) calls
        const activeCalls = (data.missedCalls || []).filter(
          (c: MissedCall) => c.status === 'assigned' || c.status === 'pending'
        );
        setMissedCalls(activeCalls);
      }
    } catch (error) {
      console.error('Fetch my missed calls error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyMissedCalls();
    // Refresh every 20 seconds
    const interval = setInterval(fetchMyMissedCalls, 20000);
    return () => clearInterval(interval);
  }, [userId]);

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
      await fetchMyMissedCalls();
    } catch (error) {
      console.error('Callback error:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleResolve = async (call: MissedCall) => {
    setProcessingId(call.id);
    try {
      await fetch('/api/calls/missed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: call.id,
          action: 'resolve',
          operatorName,
        }),
      });
      await fetchMyMissedCalls();
    } catch (error) {
      console.error('Resolve error:', error);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="card border-blue-200">
        <div className="card-header flex items-center gap-2 bg-blue-50">
          <PhoneMissed className="w-5 h-5 text-blue-600" />
          Menga tayinlangan qo&apos;ng&apos;iroqlar
        </div>
        <div className="card-body flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="card border-blue-200">
      <div className="card-header flex items-center justify-between bg-blue-50">
        <div className="flex items-center gap-2">
          <PhoneMissed className="w-5 h-5 text-blue-600" />
          <span className="font-medium">Menga tayinlangan</span>
          {missedCalls.length > 0 && (
            <span className="bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              {missedCalls.length}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchMyMissedCalls();
          }}
          className="p-1 hover:bg-blue-100 rounded"
          title="Yangilash"
        >
          <RefreshCw className="w-4 h-4 text-blue-600" />
        </button>
      </div>
      <div className="card-body p-0">
        {missedCalls.length === 0 ? (
          <div className="text-center text-gray-500 py-6">
            <Check className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-70" />
            <p className="text-sm">Sizga tayinlangan qo&apos;ng&apos;iroqlar yo&apos;q</p>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto divide-y">
            {missedCalls.map((call) => (
              <div
                key={call.id}
                className="p-3 hover:bg-blue-50/50 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {formatPhone(call.phoneNumber)}
                    </span>
                    {call.isDriver && (
                      <span className="badge badge-yellow text-xs flex-shrink-0">Driver</span>
                    )}
                    {call.status === 'called_back' && (
                      <span className="badge badge-green text-xs flex-shrink-0">Qayta qo&apos;ng&apos;irildi</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    {(call.contactName || call.driverName) && (
                      <span className="flex items-center gap-1 truncate">
                        <User className="w-3 h-3 flex-shrink-0" />
                        {call.contactName || call.driverName}
                      </span>
                    )}
                    <span className="flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {format(new Date(call.callStart), 'HH:mm')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
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
                    onClick={() => handleResolve(call)}
                    disabled={processingId === call.id}
                    className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
                    title="Hal qilindi deb belgilash"
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
