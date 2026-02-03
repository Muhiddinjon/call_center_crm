'use client';

import { Phone, PhoneIncoming, PhoneOutgoing, User, Car } from 'lucide-react';
import type { CallLog } from '@/lib/types';
import { formatPhone, formatTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ActiveCallsListProps {
  calls: CallLog[];
  selectedCallId?: string;
  onSelectCall: (call: CallLog) => void;
}

export function ActiveCallsList({
  calls,
  selectedCallId,
  onSelectCall,
}: ActiveCallsListProps) {
  if (calls.length === 0) {
    return (
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Phone className="w-5 h-5 text-green-600" />
          Faol qo'ng'iroqlar
        </div>
        <div className="card-body text-center text-gray-500 py-8">
          <Phone className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>Hozircha faol qo'ng'iroqlar yo'q</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header flex items-center gap-2">
        <Phone className="w-5 h-5 text-green-600" />
        Faol qo'ng'iroqlar
        <span className="badge badge-green ml-auto">{calls.length}</span>
      </div>
      <div className="divide-y max-h-[400px] overflow-y-auto">
        {calls.map((call) => (
          <div
            key={call.id}
            onClick={() => onSelectCall(call)}
            className={cn(
              'p-3 cursor-pointer transition-all hover:bg-gray-50',
              selectedCallId === call.id && 'bg-blue-50 border-l-4 border-l-blue-500',
              call.isDriver && 'border-l-4 border-l-yellow-500',
              call.callType === 'incoming' && !call.isDriver && 'border-l-4 border-l-green-500'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                call.callType === 'incoming' ? 'bg-green-100' : 'bg-blue-100'
              )}>
                {call.callType === 'incoming' ? (
                  <PhoneIncoming className="w-5 h-5 text-green-600" />
                ) : (
                  <PhoneOutgoing className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {formatPhone(call.phoneNumber)}
                  </span>
                  {call.isDriver && (
                    <span className="badge badge-yellow text-xs">
                      <Car className="w-3 h-3 mr-1" />
                      Driver
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{formatTime(call.callStart)}</span>
                  {call.driverName && (
                    <>
                      <span>•</span>
                      <span className="truncate">{call.driverName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
