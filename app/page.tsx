'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Headphones, LogOut, Wifi, WifiOff, Settings } from 'lucide-react';
import { CallForm } from '@/components/dashboard/CallForm';
import { ManualCallForm } from '@/components/dashboard/ManualCallForm';
import { PhoneHistory } from '@/components/dashboard/PhoneHistory';
import { IncomingCallModal } from '@/components/dashboard/IncomingCallModal';
import { MissedCalls } from '@/components/dashboard/MissedCalls';
import { MyMissedCalls } from '@/components/dashboard/MyMissedCalls';
import { useRealtime } from '@/hooks/useRealtime';
import type { CallLog } from '@/lib/types';

interface User {
  id: string;
  username: string;
  fullName?: string;
  isAdmin: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallLog | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch current user
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          router.push('/login');
        } else {
          setUser(data);
          // Request notification permission
          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
          }
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  // Real-time events
  const handleIncomingCall = useCallback((call: CallLog) => {
    if (call.callType === 'incoming') {
      setIncomingCall(call);
    }
    setRefreshTrigger((t) => t + 1);
  }, []);

  const handleCallEnded = useCallback(() => {
    setRefreshTrigger((t) => t + 1);
  }, []);

  const handleMissedCall = useCallback(() => {
    // Refresh missed calls lists when a new missed call is assigned
    setRefreshTrigger((t) => t + 1);
  }, []);

  const { isConnected } = useRealtime({
    onIncomingCall: handleIncomingCall,
    onCallEnded: handleCallEnded,
    onMissedCall: handleMissedCall,
  });

  // Logout
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Headphones className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-800">Call Center CRM</span>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* Connection status */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {isConnected ? (
                  <Wifi className="w-4 h-4" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {isConnected ? 'Ulangan' : 'Uzilgan'}
                </span>
              </div>

              {/* User info */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {user.fullName || user.username}
                </span>
                {user.isAdmin && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Admin panel"
                  >
                    <Settings className="w-5 h-5 text-gray-600" />
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                  title="Chiqish"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Manual call form + Missed calls */}
          <div className="space-y-6">
            <ManualCallForm
              onCallCreated={(call) => {
                setSelectedCall(call);
                setRefreshTrigger((t) => t + 1);
              }}
            />
            {/* My assigned missed calls - round-robin distributed */}
            <MyMissedCalls
              userId={user.id}
              operatorName={user.fullName || user.username}
              onCallback={(phoneNumber) => {
                window.location.href = `sip:${phoneNumber}`;
              }}
              key={`my-missed-${refreshTrigger}`}
            />
            {/* All unhandled missed calls */}
            <MissedCalls
              operatorName={user.fullName || user.username}
              onCallback={(phoneNumber) => {
                // Open phone dialer with sip protocol
                window.location.href = `sip:${phoneNumber}`;
              }}
              key={`missed-${refreshTrigger}`}
            />
          </div>

          {/* Center column - Call form */}
          <div>
            <CallForm
              call={selectedCall}
              operatorName={user.fullName || user.username}
              onSaved={() => setRefreshTrigger((t) => t + 1)}
            />
          </div>

          {/* Right column - Phone number history with comments */}
          <div>
            <PhoneHistory
              phoneNumber={selectedCall?.phoneNumber || null}
              currentCallId={selectedCall?.id}
              onSelectCall={setSelectedCall}
              key={`${selectedCall?.phoneNumber}-${refreshTrigger}`}
            />
          </div>
        </div>
      </main>

      {/* Incoming call modal */}
      <IncomingCallModal
        call={incomingCall}
        onClose={() => setIncomingCall(null)}
        onAccept={(call) => {
          setSelectedCall(call);
          setIncomingCall(null);
        }}
      />
    </div>
  );
}
