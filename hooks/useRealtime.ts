'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { RealtimeEvent, CallLog } from '@/lib/types';
import { getPusherClient, CHANNELS, EVENTS } from '@/lib/pusher';

interface UseRealtimeOptions {
  onIncomingCall?: (call: CallLog) => void;
  onCallEnded?: (callId: string) => void;
  onCallUpdated?: (call: CallLog) => void;
  onMissedCall?: (data: unknown) => void;
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const pusherRef = useRef<ReturnType<typeof getPusherClient> | null>(null);

  // Use refs to store callbacks to avoid reconnecting on every render
  const onIncomingCallRef = useRef(options.onIncomingCall);
  const onCallEndedRef = useRef(options.onCallEnded);
  const onCallUpdatedRef = useRef(options.onCallUpdated);
  const onMissedCallRef = useRef(options.onMissedCall);

  // Update refs when callbacks change
  useEffect(() => {
    onIncomingCallRef.current = options.onIncomingCall;
    onCallEndedRef.current = options.onCallEnded;
    onCallUpdatedRef.current = options.onCallUpdated;
    onMissedCallRef.current = options.onMissedCall;
  }, [options.onIncomingCall, options.onCallEnded, options.onCallUpdated, options.onMissedCall]);

  useEffect(() => {
    console.log('[Pusher] Connecting...');

    const pusher = getPusherClient();
    pusherRef.current = pusher;

    // Subscribe to calls channel
    const channel = pusher.subscribe(CHANNELS.CALLS);

    // Connection state
    pusher.connection.bind('connected', () => {
      console.log('[Pusher] Connected');
      setIsConnected(true);
    });

    pusher.connection.bind('disconnected', () => {
      console.log('[Pusher] Disconnected');
      setIsConnected(false);
    });

    pusher.connection.bind('error', (err: Error) => {
      console.error('[Pusher] Connection error:', err);
      setIsConnected(false);
    });

    // Incoming call event
    channel.bind(EVENTS.INCOMING_CALL, (data: CallLog) => {
      console.log('[Pusher] Incoming call:', data.phoneNumber);
      setLastEvent({
        id: `pusher-${Date.now()}`,
        type: 'incoming_call',
        data,
        timestamp: Date.now(),
      });
      if (onIncomingCallRef.current) {
        onIncomingCallRef.current(data);
      }
    });

    // Call ended event
    channel.bind(EVENTS.CALL_ENDED, (data: { callId: string }) => {
      console.log('[Pusher] Call ended:', data.callId);
      setLastEvent({
        id: `pusher-${Date.now()}`,
        type: 'call_ended',
        data,
        timestamp: Date.now(),
      });
      if (onCallEndedRef.current) {
        onCallEndedRef.current(data.callId);
      }
    });

    // Call updated event
    channel.bind(EVENTS.CALL_UPDATED, (data: CallLog) => {
      console.log('[Pusher] Call updated:', data.id);
      setLastEvent({
        id: `pusher-${Date.now()}`,
        type: 'call_updated',
        data,
        timestamp: Date.now(),
      });
      if (onCallUpdatedRef.current) {
        onCallUpdatedRef.current(data);
      }
    });

    // Missed call event
    channel.bind(EVENTS.MISSED_CALL, (data: unknown) => {
      console.log('[Pusher] Missed call:', data);
      setLastEvent({
        id: `pusher-${Date.now()}`,
        type: 'missed_call',
        data: data as RealtimeEvent['data'],
        timestamp: Date.now(),
      });
      if (onMissedCallRef.current) {
        onMissedCallRef.current(data);
      }
    });

    // Check initial connection state
    if (pusher.connection.state === 'connected') {
      setIsConnected(true);
    }

    return () => {
      console.log('[Pusher] Cleaning up...');
      channel.unbind_all();
      pusher.unsubscribe(CHANNELS.CALLS);
    };
  }, []);

  return { isConnected, lastEvent };
}

// Fallback polling hook for environments where Pusher doesn't work
export function usePolling(intervalMs = 5000) {
  const [activeCalls, setActiveCalls] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActiveCalls = useCallback(async () => {
    try {
      const response = await fetch('/api/calls/active');
      if (response.ok) {
        const data = await response.json();
        setActiveCalls(data);
      }
    } catch (error) {
      console.error('Failed to fetch active calls:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveCalls();
    const interval = setInterval(fetchActiveCalls, intervalMs);
    return () => clearInterval(interval);
  }, [fetchActiveCalls, intervalMs]);

  return { activeCalls, isLoading, refresh: fetchActiveCalls };
}
