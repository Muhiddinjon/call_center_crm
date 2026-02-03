'use client';

import { useState, useEffect, useCallback } from 'react';
import { History, RefreshCw, PhoneIncoming, PhoneOutgoing, Car } from 'lucide-react';
import type { CallLog } from '@/lib/types';
import { formatPhone, formatTime, cn } from '@/lib/utils';

interface CallHistoryProps {
  onSelectCall: (call: CallLog) => void;
  refreshTrigger?: number;
}

export function CallHistory({ onSelectCall, refreshTrigger }: CallHistoryProps) {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/calls?limit=50');
      if (response.ok) {
        const data = await response.json();
        setCalls(data);
      }
    } catch (error) {
      console.error('Fetch history error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshTrigger]);

  return (
    <div className="card">
      <div className="card-header flex items-center gap-2">
        <History className="w-5 h-5 text-gray-600" />
        Qo'ng'iroqlar tarixi
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="ml-auto p-1 hover:bg-gray-100 rounded"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>
      <div className="divide-y max-h-[600px] overflow-y-auto">
        {loading && calls.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
            Yuklanmoqda...
          </div>
        ) : calls.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            Qo'ng'iroqlar tarixi bo'sh
          </div>
        ) : (
          calls.map((call) => (
            <div
              key={call.id}
              onClick={() => onSelectCall(call)}
              className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  call.callType === 'incoming' ? 'bg-green-100' : 'bg-blue-100'
                )}>
                  {call.callType === 'incoming' ? (
                    <PhoneIncoming className="w-4 h-4 text-green-600" />
                  ) : (
                    <PhoneOutgoing className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {formatPhone(call.phoneNumber)}
                    </span>
                    {call.isDriver && (
                      <Car className="w-3 h-3 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatTime(call.callStart)}</span>
                    {call.region && (
                      <>
                        <span>•</span>
                        <span className="truncate">{call.region}</span>
                      </>
                    )}
                    {call.callDuration && (
                      <>
                        <span>•</span>
                        <span>{Math.floor(call.callDuration / 60)}:{(call.callDuration % 60).toString().padStart(2, '0')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
