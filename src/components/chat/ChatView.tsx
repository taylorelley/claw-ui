import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pin, PinOff, Pencil, Check, X, Trash2 } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ComposeBar } from './ComposeBar';
import { StreamingIndicator } from './StreamingIndicator';
import { useApp } from '../../context/AppContext';
import { useSession } from '../../hooks/useSession';
import { useGateway } from '../../hooks/useGateway';
import { useAdaptiveEngine } from '../../hooks/useAdaptiveEngine';
import { cn } from '../../lib/cn';
import type { A2UIMessage } from '../../lib/types';

export function ChatView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const {
    messages, loadingMessages, loadMessages, addMessage,
    updateSessionTitle, deleteSession, togglePin,
    appendToLastAgentMessage, updateLastAgentA2UI,
  } = useSession();
  const { trackEvent, suggestedActions, generateSuggestions } = useAdaptiveEngine();

  const [streaming, setStreaming] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const session = state.sessions.find(s => s.id === sessionId);
  const connection = session?.agent_connection_id
    ? state.connections.find(c => c.id === session.agent_connection_id)
    : state.connections.find(c => c.is_default) || state.connections[0];

  const handleA2UIMessage = useCallback((msg: A2UIMessage) => {
    if (msg.type === 'updateComponents' || msg.type === 'updateDataModel') {
      updateLastAgentA2UI({
        surfaceId: msg.surfaceId,
        components: Array.isArray(msg.payload) ? msg.payload : [],
        dataModel: {},
      });
    }
  }, [updateLastAgentA2UI]);

  const handleTextMessage = useCallback((text: string) => {
    if (sessionId) appendToLastAgentMessage(text, sessionId);
    setStreaming(false);
  }, [appendToLastAgentMessage, sessionId]);

  const { status, connect, sendMessage, sendAction } = useGateway({
    url: connection?.gateway_url || null,
    authToken: connection?.auth_token,
    onA2UIMessage: handleA2UIMessage,
    onTextMessage: handleTextMessage,
  });

  useEffect(() => {
    if (sessionId) {
      dispatch({ type: 'SET_ACTIVE_SESSION', payload: sessionId });
      loadMessages(sessionId);
    }
  }, [sessionId, loadMessages, dispatch]);

  useEffect(() => {
    if (connection && status === 'disconnected') {
      connect();
    }
  }, [connection, status, connect]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  useEffect(() => {
    if (messages.length > 0) {
      const recent = messages.slice(-3).map(m => m.content);
      generateSuggestions(recent);
    }
  }, [messages, generateSuggestions]);

  const handleSend = async (text: string) => {
    if (!sessionId) return;
    await addMessage(sessionId, 'user', text);
    trackEvent('command_sent', { command: text }, sessionId);
    setStreaming(true);

    if (status === 'connected') {
      sendMessage(text, sessionId);
    } else {
      setTimeout(() => {
        appendToLastAgentMessage(`I received your message: "${text}"\n\nNote: This is a simulated response. Connect to an OpenClaw gateway to interact with a live agent. You can configure your gateway connection in Agent Config.`, sessionId);
        setStreaming(false);
        if (sessionId) {
          addMessage(sessionId, 'agent', `I received your message: "${text}"\n\nNote: This is a simulated response. Connect to an OpenClaw gateway to interact with a live agent.`);
        }
      }, 1200);
    }

    if (messages.length === 0 && text.length > 3) {
      const title = text.length > 40 ? text.slice(0, 40) + '...' : text;
      updateSessionTitle(sessionId, title);
    }
  };

  const handleSuggestedAction = (action: string) => {
    handleSend(action);
  };

  const startEditTitle = () => {
    setTitleInput(session?.title || '');
    setEditingTitle(true);
  };

  const saveTitle = () => {
    if (sessionId && titleInput.trim()) {
      updateSessionTitle(sessionId, titleInput.trim());
    }
    setEditingTitle(false);
  };

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center text-foreground-muted text-sm">
        Session not found
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 border-b border-border flex items-center px-4 gap-2 shrink-0">
        {editingTitle ? (
          <div className="flex items-center gap-1.5 flex-1">
            <input
              value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveTitle()}
              className="flex-1 bg-transparent border-b border-accent text-sm text-foreground outline-none"
              autoFocus
            />
            <button onClick={saveTitle} className="w-6 h-6 rounded flex items-center justify-center text-success hover:bg-success-muted">
              <Check size={14} />
            </button>
            <button onClick={() => setEditingTitle(false)} className="w-6 h-6 rounded flex items-center justify-center text-foreground-muted hover:bg-surface-2">
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-medium text-foreground truncate flex-1">{session.title}</h2>
            <button onClick={startEditTitle} className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors">
              <Pencil size={13} />
            </button>
          </>
        )}

        <div className={cn(
          'w-1.5 h-1.5 rounded-full',
          status === 'connected' ? 'bg-success' : status === 'connecting' ? 'bg-warning animate-pulse' : 'bg-foreground-muted',
        )} />

        <button
          onClick={() => sessionId && togglePin(sessionId)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-accent hover:bg-surface-2 transition-colors"
        >
          {session.is_pinned ? <PinOff size={13} /> : <Pin size={13} />}
        </button>

        <button
          onClick={() => { deleteSession(session.id); navigate('/'); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-error hover:bg-error-muted transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyChat />
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onA2UIAction={action => {
                if (action.event) sendAction(action.event.name, action.event.context);
              }}
            />
          ))
        )}
        {streaming && <StreamingIndicator />}
      </div>

      <ComposeBar
        onSend={handleSend}
        isStreaming={streaming}
        onStop={() => setStreaming(false)}
        suggestedActions={messages.length > 0 ? suggestedActions : []}
        onSuggestedAction={handleSuggestedAction}
      />
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8 py-16">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-5">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Start a conversation</h3>
      <p className="text-sm text-foreground-muted max-w-sm leading-relaxed">
        Send a message to begin interacting with your AI agent. The interface will adapt and suggest actions based on your conversation.
      </p>
    </div>
  );
}
