'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource('/api/events');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as RealtimeEvent;
        setLastEvent(data);

        switch (data.type) {
          case 'incoming_call':
            if (data.data && options.onIncomingCall) {
              options.onIncomingCall(data.data as CallLog);
            }
            break;
          case 'call_ended':
            if (data.data && options.onCallEnded) {
              const callData = data.data as { callId: string };
              options.onCallEnded(callData.callId);
            }
            break;
          case 'call_updated':
            if (data.data && options.onCallUpdated) {
              options.onCallUpdated(data.data as CallLog);
            }
            break;
          case 'missed_call':
            if (data.data && options.onMissedCall) {
              options.onMissedCall(data.data);
            }
            break;
        }
      } catch (error) {
        console.error('Failed to parse SSE event:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();

      // Reconnect with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      }
    };
  }, [options]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

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
