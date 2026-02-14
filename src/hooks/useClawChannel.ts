import { useState, useRef, useCallback, useEffect } from 'react';

interface UseClawChannelOptions {
  url?: string;
  authToken?: string;
  agentId?: string; // For relay server: which agent to route to
  onMessage?: (text: string) => void;
  autoReconnect?: boolean;
  mode?: 'direct' | 'relay'; // Direct to plugin or via relay server
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface IncomingMessage {
  type: 'auth_ok' | 'auth_error' | 'message' | 'error' | 'agent_selected' | 'agent_error';
  content?: string;
  role?: 'user' | 'assistant';
  message?: string;
  agentId?: string;
}

interface OutgoingMessage {
  type: 'auth' | 'message' | 'action' | 'select_agent';
  token?: string;
  content?: string;
  method?: string;
  params?: any;
  agentId?: string;
}

export function useClawChannel({ 
  url, 
  authToken, 
  agentId,
  onMessage, 
  autoReconnect = true,
  mode = 'direct',
}: UseClawChannelOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [currentAgent, setCurrentAgent] = useState<string | undefined>(agentId);
  const [error, setError] = useState<string | null>(null);
  
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
    setError(null);
  }, []);

  const switchAgent = useCallback((newAgentId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Cannot switch agent: not connected');
      return;
    }
    
    if (mode === 'relay') {
      wsRef.current.send(JSON.stringify({
        type: 'select_agent',
        agentId: newAgentId,
      } as OutgoingMessage));
      setCurrentAgent(newAgentId);
    } else {
      console.warn('Agent switching only supported in relay mode');
    }
  }, [mode]);

  const connect = useCallback(() => {
    // Determine WebSocket URL based on mode
    let wsUrl: string;
    
    if (url) {
      wsUrl = url;
    } else if (mode === 'relay') {
      // Default relay server endpoint
      wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/relay`;
    } else {
      // Default direct plugin endpoint
      wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    }
    
    disconnect();
    setStatus('connecting');
    setError(null);

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
      
      // For relay mode, select agent after auth
      if (mode === 'relay' && currentAgent) {
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'select_agent',
              agentId: currentAgent,
            } as OutgoingMessage));
          }
        }, 100); // Small delay to allow auth to complete
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: IncomingMessage = JSON.parse(event.data);
        
        switch (msg.type) {
          case 'auth_ok':
            // Authentication successful
            setError(null);
            break;
            
          case 'auth_error':
            console.error('Authentication failed:', msg.message);
            setStatus('error');
            setError(msg.message || 'Authentication failed');
            ws.close();
            break;
          
          case 'agent_selected':
            // Agent successfully selected
            if (msg.agentId) {
              setCurrentAgent(msg.agentId);
            }
            break;
          
          case 'agent_error':
            console.error('Agent selection error:', msg.message);
            setError(msg.message || 'Agent selection failed');
            break;
            
          case 'message':
            if (msg.content) {
              onMessageRef.current?.(msg.content);
            }
            break;
            
          case 'error':
            console.error('WebSocket error:', msg.message);
            setError(msg.message || 'Unknown error');
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
      setError('Connection error');
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
  }, [url, authToken, autoReconnect, mode, currentAgent, disconnect]);

  useEffect(() => { 
    connectRef.current = connect; 
  }, [connect]);

  const sendMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: not connected');
      setError('Not connected');
      return false;
    }
    
    try {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content: text,
      } as OutgoingMessage));
      return true;
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
      return false;
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { 
    status, 
    error,
    currentAgent,
    connect, 
    disconnect, 
    switchAgent,
    sendMessage,
    isConnected: status === 'connected',
  };
}
