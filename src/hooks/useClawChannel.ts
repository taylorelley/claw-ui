import { useState, useRef, useCallback, useEffect } from 'react';

interface UseClawChannelOptions {
  url?: string;
  authToken?: string;
  onMessage?: (text: string) => void;
  autoReconnect?: boolean;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface IncomingMessage {
  type: 'auth_ok' | 'auth_error' | 'message' | 'error';
  content?: string;
  role?: 'user' | 'assistant';
  message?: string;
}

interface OutgoingMessage {
  type: 'auth' | 'message' | 'action';
  token?: string;
  content?: string;
  method?: string;
  params?: any;
}

export function useClawChannel({ 
  url, 
  authToken, 
  onMessage, 
  autoReconnect = true 
}: UseClawChannelOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttemptRef = useRef(0);
  const connectRef = useRef<() => void>();
  const onMessageRef = useRef(onMessage);

  useEffect(() => { 
    onMessageRef.current = onMessage; 
  }, [onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const connect = useCallback(() => {
    // Default to same-origin /ws endpoint
    const wsUrl = url || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    
    disconnect();
    setStatus('connecting');

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      reconnectAttemptRef.current = 0;
      
      // Send authentication if token provided
      if (authToken) {
        ws.send(JSON.stringify({ 
          type: 'auth', 
          token: authToken 
        } as OutgoingMessage));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: IncomingMessage = JSON.parse(event.data);
        
        switch (msg.type) {
          case 'auth_ok':
            // Authentication successful
            break;
            
          case 'auth_error':
            console.error('Authentication failed:', msg.message);
            setStatus('error');
            ws.close();
            break;
            
          case 'message':
            if (msg.content) {
              onMessageRef.current?.(msg.content);
            }
            break;
            
          case 'error':
            console.error('WebSocket error:', msg.message);
            break;
            
          default:
            // Fallback for plain text messages
            if (typeof event.data === 'string') {
              onMessageRef.current?.(event.data);
            }
        }
      } catch (error) {
        // Not JSON, treat as plain text
        if (typeof event.data === 'string') {
          onMessageRef.current?.(event.data);
        }
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('error');
    };

    ws.onclose = () => {
      setStatus('disconnected');
      
      if (autoReconnect) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
        reconnectAttemptRef.current++;
        reconnectTimerRef.current = setTimeout(() => {
          connectRef.current?.();
        }, delay);
      }
    };
  }, [url, authToken, autoReconnect, disconnect]);

  useEffect(() => { 
    connectRef.current = connect; 
  }, [connect]);

  const sendMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: not connected');
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: 'message',
      content: text,
    } as OutgoingMessage));
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { 
    status, 
    connect, 
    disconnect, 
    sendMessage,
    isConnected: status === 'connected',
  };
}
