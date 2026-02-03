'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { RealtimeEvent, CallLog } from '@/lib/types';

interface UseRealtimeOptions {
  onIncomingCall?: (call: CallLog) => void;
  onCallEnded?: (callId: string) => void;
  onCallUpdated?: (call: CallLog) => void;
  onMissedCall?: (data: unknown) => void;
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  // Use refs to store callbacks to avoid recreating EventSource on every render
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
    // Don't create multiple connections
    if (eventSourceRef.current) {
      return;
    }

    const connect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      console.log('[SSE Client] Connecting...');
      const eventSource = new EventSource('/api/events');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[SSE Client] Connection opened');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as RealtimeEvent;

          // Log non-ping events
          if (data.type && data.type !== 'connected') {
            console.log('[SSE Client] Received event:', data.type, data.id || '');
          }

          setLastEvent(data);

          switch (data.type) {
            case 'incoming_call':
              console.log('[SSE Client] Incoming call received:', data.data);
              if (data.data && onIncomingCallRef.current) {
                onIncomingCallRef.current(data.data as CallLog);
              }
              break;
            case 'call_ended':
              if (data.data && onCallEndedRef.current) {
                const callData = data.data as { callId: string };
                onCallEndedRef.current(callData.callId);
              }
              break;
            case 'call_updated':
              if (data.data && onCallUpdatedRef.current) {
                onCallUpdatedRef.current(data.data as CallLog);
              }
              break;
            case 'missed_call':
              console.log('[SSE Client] Missed call received:', data.data);
              if (data.data && onMissedCallRef.current) {
                onMissedCallRef.current(data.data);
              }
              break;
          }
        } catch (error) {
          console.error('[SSE Client] Failed to parse SSE event:', error);
        }
      };

      eventSource.onerror = () => {
        console.log('[SSE Client] Connection error, will reconnect...');
        setIsConnected(false);
        eventSource.close();
        eventSourceRef.current = null;

        // Reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`[SSE Client] Reconnecting in ${delay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };
    };

    connect();

    return () => {
      console.log('[SSE Client] Cleaning up connection');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - only run once on mount

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
