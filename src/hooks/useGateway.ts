import { useState, useRef, useCallback, useEffect } from 'react';
import type { GatewayMessage, A2UIMessage } from '../lib/types';

interface UseGatewayOptions {
  url: string | null;
  authToken?: string | null;
  onA2UIMessage?: (msg: A2UIMessage) => void;
  onTextMessage?: (text: string) => void;
  autoReconnect?: boolean;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export function useGateway({ url, authToken, onA2UIMessage, onTextMessage, autoReconnect = true }: UseGatewayOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const callIdRef = useRef(0);
  const pendingRef = useRef<Map<string, PendingCall>>(new Map());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttemptRef = useRef(0);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const connect = useCallback(() => {
    if (!url) return;
    disconnect();
    setStatus('connecting');

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      reconnectAttemptRef.current = 0;
      if (authToken) {
        ws.send(JSON.stringify({ method: 'auth', params: { token: authToken } }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const lines = String(event.data).split('\n').filter(Boolean);
        for (const line of lines) {
          const msg = JSON.parse(line);
          if (msg.id && pendingRef.current.has(msg.id)) {
            const pending = pendingRef.current.get(msg.id)!;
            clearTimeout(pending.timeout);
            pendingRef.current.delete(msg.id);
            if (msg.error) pending.reject(msg.error);
            else pending.resolve(msg.result);
            continue;
          }
          if (msg.type && ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'].includes(msg.type)) {
            onA2UIMessage?.(msg as A2UIMessage);
          } else if (msg.content || msg.text) {
            onTextMessage?.(msg.content || msg.text);
          }
        }
      } catch {
        if (typeof event.data === 'string') {
          onTextMessage?.(event.data);
        }
      }
    };

    ws.onerror = () => setStatus('error');

    ws.onclose = () => {
      setStatus('disconnected');
      if (autoReconnect) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
        reconnectAttemptRef.current++;
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    };
  }, [url, authToken, onA2UIMessage, onTextMessage, autoReconnect, disconnect]);

  const rpcCall = useCallback((method: string, params?: unknown): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'));
        return;
      }
      const id = String(++callIdRef.current);
      const timeout = setTimeout(() => {
        pendingRef.current.delete(id);
        reject(new Error('RPC timeout'));
      }, 15000);
      pendingRef.current.set(id, { resolve, reject, timeout });
      wsRef.current.send(JSON.stringify({ id, method, params } as GatewayMessage));
    });
  }, []);

  const sendMessage = useCallback((text: string, sessionId?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      method: 'sessions.send',
      params: { text, sessionId },
    }));
  }, []);

  const sendAction = useCallback((event: string, context?: Record<string, unknown>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      method: 'action',
      params: { event, context },
    }));
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
      pendingRef.current.forEach(p => {
        clearTimeout(p.timeout);
        p.reject(new Error('Disconnected'));
      });
      pendingRef.current.clear();
    };
  }, [disconnect]);

  return { status, connect, disconnect, rpcCall, sendMessage, sendAction };
}
