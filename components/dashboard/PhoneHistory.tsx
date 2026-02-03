'use client';

import { useState, useEffect } from 'react';
import {
  History,
  RefreshCw,
  PhoneIncoming,
  PhoneOutgoing,
  Car,
  User,
  MessageSquare,
  Clock,
  Phone,
  MapPin,
  Star,
  Briefcase,
} from 'lucide-react';
import { format } from 'date-fns';
import type { CallLog } from '@/lib/types';
import { formatPhone, formatDuration, cn } from '@/lib/utils';

interface PhoneHistoryProps {
  phoneNumber: string | null;
  currentCallId?: string;
  onSelectCall?: (call: CallLog) => void;
}

interface ContactInfo {
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
}

export function PhoneHistory({ phoneNumber, currentCallId, onSelectCall }: PhoneHistoryProps) {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'comments'>('timeline');

  useEffect(() => {
    if (!phoneNumber) {
      setCalls([]);
      setContactInfo(null);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/calls/history?phone=${encodeURIComponent(phoneNumber)}`);
        if (response.ok) {
          const data = await response.json();
          setCalls(data.calls || []);
          setContactInfo(data.contactInfo || null);
        }
      } catch (error) {
        console.error('Fetch phone history error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [phoneNumber]);

  // Get only calls with comments
  const callsWithComments = calls.filter(c => c.notes);

  if (!phoneNumber) {
    return (
      <div className="card h-full">
        <div className="card-header flex items-center gap-2 border-b">
          <User className="w-5 h-5 text-gray-400" />
          <span className="text-gray-500">Mijoz profili</span>
        </div>
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Phone className="w-10 h-10 text-gray-300" />
          </div>
          <p className="text-gray-500 text-center">
            Telefon raqam kiriting yoki<br />qo&apos;ng&apos;iroq tanlang
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card h-full flex flex-col">
      {/* Contact Header - CRM Style */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-xl">
        <div className="flex items-start gap-4">
          <div className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0',
            contactInfo?.isDriver ? 'bg-yellow-400' : 'bg-white/20'
          )}>
            {contactInfo?.isDriver ? (
              <Car className="w-7 h-7 text-yellow-800" />
            ) : (
              <User className="w-7 h-7 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg truncate">
              {contactInfo?.driverInfo?.driverName || formatPhone(phoneNumber)}
            </h3>
            <p className="text-blue-100 text-sm">
              {formatPhone(phoneNumber)}
            </p>
            {contactInfo?.isDriver && (
              <div className="flex items-center gap-3 mt-2 text-sm">
                {contactInfo.driverInfo?.driverCar && (
                  <span className="flex items-center gap-1 text-blue-100">
                    <Car className="w-4 h-4" />
                    {contactInfo.driverInfo.driverCar}
                  </span>
                )}
                {contactInfo.driverInfo?.driverRating && (
                  <span className="flex items-center gap-1 text-yellow-300">
                    <Star className="w-4 h-4 fill-current" />
                    {contactInfo.driverInfo.driverRating}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/20">
          <div className="text-center">
            <div className="text-2xl font-bold">{contactInfo?.totalCalls || 0}</div>
            <div className="text-xs text-blue-100">Jami qo&apos;ng&apos;iroq</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{callsWithComments.length}</div>
            <div className="text-xs text-blue-100">Izohlar</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {contactInfo?.driverInfo?.managerNumber || '-'}
            </div>
            <div className="text-xs text-blue-100">Manager</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('timeline')}
          className={cn(
            'flex-1 py-3 text-sm font-medium transition-colors',
            activeTab === 'timeline'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Clock className="w-4 h-4 inline mr-1" />
          Tarix ({calls.length})
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={cn(
            'flex-1 py-3 text-sm font-medium transition-colors',
            activeTab === 'comments'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <MessageSquare className="w-4 h-4 inline mr-1" />
          Izohlar ({callsWithComments.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : activeTab === 'timeline' ? (
          /* Timeline View */
          <div className="p-4">
            {calls.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Qo&apos;ng&apos;iroqlar tarixi yo&apos;q</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                {calls.map((call, index) => (
                  <div
                    key={call.id}
                    onClick={() => onSelectCall?.(call)}
                    className={cn(
                      'relative pl-10 pb-6 cursor-pointer group',
                      index === calls.length - 1 && 'pb-0'
                    )}
                  >
                    {/* Timeline dot */}
                    <div className={cn(
                      'absolute left-2 w-5 h-5 rounded-full border-2 border-white shadow flex items-center justify-center',
                      currentCallId === call.id
                        ? 'bg-blue-600'
                        : call.callType === 'incoming'
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                    )}>
                      {call.callType === 'incoming' ? (
                        <PhoneIncoming className="w-3 h-3 text-white" />
                      ) : (
                        <PhoneOutgoing className="w-3 h-3 text-white" />
                      )}
                    </div>

                    {/* Content */}
                    <div className={cn(
                      'bg-white rounded-lg border p-3 transition-all',
                      currentCallId === call.id
                        ? 'border-blue-300 shadow-md'
                        : 'border-gray-200 group-hover:border-gray-300 group-hover:shadow-sm'
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">
                          {format(new Date(call.callStart), 'dd.MM.yyyy HH:mm')}
                        </span>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          call.callType === 'incoming'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        )}>
                          {call.callType === 'incoming' ? 'Kiruvchi' : 'Chiquvchi'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        {call.region && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <MapPin className="w-3 h-3" />
                            {call.region}
                          </span>
                        )}
                        {call.operatorName && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <Briefcase className="w-3 h-3" />
                            {call.operatorName}
                          </span>
                        )}
                        {call.callDuration && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <Clock className="w-3 h-3" />
                            {formatDuration(call.callDuration)}
                          </span>
                        )}
                      </div>

                      {call.notes && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-sm text-gray-700 line-clamp-2">{call.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Comments View */
          <div className="p-4">
            {callsWithComments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Izohlar yo&apos;q</p>
              </div>
            ) : (
              <div className="space-y-4">
                {callsWithComments.map((call) => (
                  <div
                    key={call.id}
                    onClick={() => onSelectCall?.(call)}
                    className={cn(
                      'bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200 cursor-pointer transition-all hover:shadow-md',
                      currentCallId === call.id && 'ring-2 ring-blue-500'
                    )}
                  >
                    {/* Comment header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          call.callType === 'incoming' ? 'bg-green-100' : 'bg-blue-100'
                        )}>
                          {call.callType === 'incoming' ? (
                            <PhoneIncoming className="w-4 h-4 text-green-600" />
                          ) : (
                            <PhoneOutgoing className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {call.operatorName || 'Noma\'lum operator'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(call.callStart), 'dd.MM.yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      {call.topic && (
                        <span className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
                          {call.topic}
                        </span>
                      )}
                    </div>

                    {/* Comment body */}
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex gap-2">
                        <MessageSquare className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{call.notes}</p>
                      </div>
                    </div>

                    {/* Comment footer */}
                    {call.region && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        {call.region}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
