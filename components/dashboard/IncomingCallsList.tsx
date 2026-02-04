'use client';

import { useEffect, useRef } from 'react';
import { Phone, PhoneOff, User, Car, Clock, X } from 'lucide-react';
import type { CallLog } from '@/lib/types';
import { formatPhone } from '@/lib/utils';

interface IncomingCallsListProps {
  calls: CallLog[];
  onAccept: (call: CallLog) => void;
  onDismiss: (callId: string) => void;
}

export function IncomingCallsList({
  calls,
  onAccept,
  onDismiss,
}: IncomingCallsListProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notifiedCallsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (calls.length > 0) {
      // Play sound for new calls
      if (!audioRef.current) {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audioRef.current.loop = true;
      }
      audioRef.current.play().catch(() => {});

      // Show notification for new calls
      calls.forEach(call => {
        if (!notifiedCallsRef.current.has(call.id)) {
          notifiedCallsRef.current.add(call.id);
          if (Notification.permission === 'granted') {
            new Notification('Kiruvchi qo\'ng\'iroq', {
              body: `${formatPhone(call.phoneNumber)}${call.driverName ? ` - ${call.driverName}` : ''}`,
              icon: '/phone-icon.png',
              tag: call.id,
            });
          }
        }
      });

      // Flash title
      const originalTitle = document.title;
      let isFlashing = false;
      const flashInterval = setInterval(() => {
        document.title = isFlashing
          ? `📞 ${calls.length} kiruvchi qo'ng'iroq`
          : originalTitle;
        isFlashing = !isFlashing;
      }, 1000);

      return () => {
        clearInterval(flashInterval);
        document.title = originalTitle;
      };
    } else {
      // Stop sound when no calls
      audioRef.current?.pause();
      notifiedCallsRef.current.clear();
    }
  }, [calls]);

  if (calls.length === 0) return null;

  const formatTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  return (
    <div className="fixed top-20 right-4 z-40 w-80 space-y-2 max-h-[calc(100vh-100px)] overflow-y-auto">
      {/* Header */}
      <div className="bg-red-600 text-white px-4 py-2 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 animate-pulse" />
          <span className="font-medium">
            Kiruvchi qo'ng'iroqlar ({calls.length})
          </span>
        </div>
      </div>

      {/* Calls list */}
      <div className="space-y-2">
        {calls.map((call, index) => (
          <div
            key={call.id}
            className={`bg-white rounded-lg shadow-lg border-l-4 ${
              index === 0 ? 'border-red-500 animate-pulse' : 'border-orange-400'
            }`}
          >
            <div className="p-3">
              {/* Phone number and time */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold">
                  {formatPhone(call.phoneNumber)}
                </span>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {formatTime(call.callStart)}
                </div>
              </div>

              {/* Driver badge */}
              {call.isDriver && (
                <div className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded mb-2">
                  <Car className="w-3 h-3" />
                  <span>{call.driverName || 'Driver'}</span>
                  {call.driverId && <span className="text-yellow-600">#{call.driverId}</span>}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => onDismiss(call.id)}
                  className="flex-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Yopish
                </button>
                <button
                  onClick={() => onAccept(call)}
                  className="flex-1 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded flex items-center justify-center gap-1"
                >
                  <Phone className="w-4 h-4" />
                  Qabul
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
