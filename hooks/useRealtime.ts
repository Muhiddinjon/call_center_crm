'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { RealtimeEvent, CallLog } from '@/lib/types';

interface UseRealtimeOptions {
  onIncomingCall?: (call: CallLog) => void;
  onCallEnded?: (callId: string) => void;
  onCallUpdated?: (call: CallLog) => void;
  onMissedCall?: (data: unknown) => void;
}

// Polling interval in milliseconds (5 seconds)
const POLL_INTERVAL = 5000;

export function useRealtime(options: UseRealtimeOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const lastEventIdRef = useRef<string>('0');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Use refs to store callbacks to avoid re-polling on every render
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

  // Process events from polling response
  const processEvents = useCallback((events: Array<{ id: string; type: string; data: unknown }>) => {
    for (const event of events) {
      const realtimeEvent: RealtimeEvent = {
        id: event.id,
        type: event.type as RealtimeEvent['type'],
        data: event.data as RealtimeEvent['data'],
        timestamp: Date.now(),
      };

      // Log non-ping events
      if (event.type && event.type !== 'connected') {
        console.log('[Polling] Received event:', event.type, event.id || '');
      }

      setLastEvent(realtimeEvent);

      switch (event.type) {
        case 'incoming_call':
          console.log('[Polling] Incoming call received:', event.data);
          if (event.data && onIncomingCallRef.current) {
            onIncomingCallRef.current(event.data as CallLog);
          }
          break;
        case 'call_ended':
          if (event.data && onCallEndedRef.current) {
            const callData = event.data as { callId: string };
            onCallEndedRef.current(callData.callId);
          }
          break;
        case 'call_updated':
          if (event.data && onCallUpdatedRef.current) {
            onCallUpdatedRef.current(event.data as CallLog);
          }
          break;
        case 'missed_call':
          console.log('[Polling] Missed call received:', event.data);
          if (event.data && onMissedCallRef.current) {
            onMissedCallRef.current(event.data);
          }
          break;
      }
    }
  }, []);

  // Poll for new events
  const poll = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      const response = await fetch(`/api/events/poll?lastEventId=${lastEventIdRef.current}`);

      if (!response.ok) {
        console.error('[Polling] Request failed:', response.status);
        setIsConnected(false);
        return;
      }

      const data = await response.json();
      setIsConnected(true);

      if (data.events && data.events.length > 0) {
        processEvents(data.events);
      }

      // Update lastEventId for next poll
      if (data.lastEventId) {
        lastEventIdRef.current = data.lastEventId;
      }
    } catch (error) {
      console.error('[Polling] Error:', error);
      setIsConnected(false);
    }
  }, [processEvents]);

  useEffect(() => {
    isMountedRef.current = true;
    console.log('[Polling] Starting polling...');

    // Initial poll
    poll();

    // Set up polling interval
    pollingRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      console.log('[Polling] Stopping polling');
      isMountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [poll]);

  return { isConnected, lastEvent };
}

// Fallback polling hook for environments where SSE doesn't work well
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
