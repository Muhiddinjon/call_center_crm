'use client';

import { useEffect, useRef } from 'react';
import { X, Phone, PhoneOff, User, Car, MapPin } from 'lucide-react';
import type { CallLog } from '@/lib/types';
import { formatPhone } from '@/lib/utils';

interface IncomingCallModalProps {
  call: CallLog | null;
  onClose: () => void;
  onAccept: (call: CallLog) => void;
}

export function IncomingCallModal({
  call,
  onClose,
  onAccept,
}: IncomingCallModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (call) {
      // Request notification permission and show notification
      if (Notification.permission === 'granted') {
        new Notification('Kiruvchi qo\'ng\'iroq', {
          body: `${formatPhone(call.phoneNumber)}${call.driverName ? ` - ${call.driverName}` : ''}`,
          icon: '/phone-icon.png',
          tag: call.id,
        });
      }

      // Play sound
      if (!audioRef.current) {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audioRef.current.loop = true;
      }
      audioRef.current.play().catch(() => {});

      // Flash title
      const originalTitle = document.title;
      let isFlashing = false;
      const flashInterval = setInterval(() => {
        document.title = isFlashing
          ? `📞 ${formatPhone(call.phoneNumber)}`
          : originalTitle;
        isFlashing = !isFlashing;
      }, 1000);

      return () => {
        clearInterval(flashInterval);
        document.title = originalTitle;
        audioRef.current?.pause();
      };
    }
  }, [call]);

  if (!call) return null;

  const handleAccept = () => {
    audioRef.current?.pause();
    onAccept(call);
  };

  const handleClose = () => {
    audioRef.current?.pause();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-pulse-border">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-6 text-center">
          {/* Animated phone icon */}
          <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
            <Phone className="w-10 h-10 text-green-600" />
          </div>

          <h2 className="text-lg text-gray-600 mb-2">Kiruvchi qo'ng'iroq</h2>

          {/* Phone number */}
          <div className="text-3xl font-bold mb-4">
            {formatPhone(call.phoneNumber)}
          </div>

          {/* Driver info */}
          {call.isDriver && (
            <div className="bg-yellow-50 rounded-lg p-4 mb-4 text-left">
              <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
                <Car className="w-5 h-5" />
                Driver ma'lumotlari
              </div>
              <div className="space-y-1 text-sm">
                {call.driverId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID:</span>
                    <span className="font-medium">{call.driverId}</span>
                  </div>
                )}
                {call.driverName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ism:</span>
                    <span className="font-medium">{call.driverName}</span>
                  </div>
                )}
                {call.driverCar && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mashina:</span>
                    <span className="font-medium">{call.driverCar}</span>
                  </div>
                )}
                {call.managerNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Manager:</span>
                    <span className="font-medium">{call.managerNumber}</span>
                  </div>
                )}
                {(() => {
                  const extraInfo = call.driverExtraInfo as Record<string, string> | undefined;
                  const region = extraInfo?.region;
                  if (!region) return null;
                  return (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Region:</span>
                      <span className="font-medium">{region}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 btn btn-danger py-3 flex items-center justify-center gap-2"
            >
              <PhoneOff className="w-5 h-5" />
              Yopish
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 btn btn-success py-3 flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Qabul qilish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
