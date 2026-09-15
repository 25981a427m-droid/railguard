import { useState, useEffect, useRef, useCallback } from 'react';
import { SystemState } from '../types';

export function useSocket() {
  const [state, setState] = useState<SystemState | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const connect = useCallback(() => {
    // Protocol detection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const wsUrl = `${protocol}//${host}:8000/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data: SystemState = JSON.parse(event.data);
          setState(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Reconnect attempt in 2 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2000);
      };

      ws.onerror = (err) => {
        console.warn('WebSocket error, retrying in background...', err);
        ws.close();
      };
    } catch (err) {
      console.error('Failed to establish WebSocket connection:', err);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 2000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const sendAction = useCallback((action: string, payload: Record<string, any> = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action, ...payload }));
    } else {
      // Fallback to REST API if WS not open
      const endpoint = action.startsWith('approve') ? `/api/advisories/${payload.advisory_id}/approve`
        : action.startsWith('reject') ? `/api/advisories/${payload.advisory_id}/reject`
        : action === 'inject_fault' ? '/api/scenario/inject'
        : action === 'toggle_loop' ? '/api/scenario/toggle_loop'
        : action === 'set_speed' ? '/api/scenario/speed'
        : action === 'reset' ? '/api/scenario/reset'
        : action === 'run_demo_scenario' ? '/api/scenario/demo'
        : null;

      if (endpoint) {
        const host = window.location.hostname || 'localhost';
        fetch(`http://${host}:8000${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(err => console.error('REST fallback error:', err));
      }
    }
  }, []);

  const approveAdvisory = useCallback((advisoryId: string) => {
    sendAction('approve_advisory', { advisory_id: advisoryId });
  }, [sendAction]);

  const rejectAdvisory = useCallback((advisoryId: string) => {
    sendAction('reject_advisory', { advisory_id: advisoryId });
  }, [sendAction]);

  const injectFault = useCallback((faultType: string) => {
    sendAction('inject_fault', { fault_type: faultType });
  }, [sendAction]);

  const toggleLoop = useCallback((loopId: string = 'LOOP-DHN') => {
    sendAction('toggle_loop', { loop_id: loopId });
  }, [sendAction]);

  const setSpeed = useCallback((speed: number) => {
    sendAction('set_speed', { speed });
  }, [sendAction]);

  const reset = useCallback(() => {
    sendAction('reset');
  }, [sendAction]);

  const runDemoScenario = useCallback(() => {
    sendAction('run_demo_scenario');
  }, [sendAction]);

  return {
    state,
    connected,
    approveAdvisory,
    rejectAdvisory,
    injectFault,
    toggleLoop,
    setSpeed,
    reset,
    runDemoScenario,
  };
}

