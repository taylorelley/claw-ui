import { useState, useEffect } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AgentCard } from './AgentCard';
import { listAgentTokens, revokeAgentToken, getAgentStatus, AgentToken } from '../../services/agentTokenService';

export function AgentList() {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<AgentToken[]>([]);
  const [statuses, setStatuses] = useState<Record<string, 'online' | 'offline'>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await listAgentTokens();
      setTokens(data);
      
      // Load status for each token
      const statusPromises = data.map(async (token) => ({
        id: token.id,
        status: await getAgentStatus(token.id),
      }));
      
      const statusResults = await Promise.all(statusPromises);
      const statusMap = statusResults.reduce(
        (acc, { id, status }) => ({ ...acc, [id]: status }),
        {}
      );
      
      setStatuses(statusMap);
    } catch (err) {
      console.error('Failed to load tokens:', err);
      setError('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    await revokeAgentToken(id);
    await loadTokens(); // Reload list
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-error/10 text-error">
        {error}
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 mb-4">
          <span className="text-3xl">🤖</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No agents configured
        </h3>
        <p className="text-foreground/60 mb-6">
          Set up your first OpenClaw agent to get started
        </p>
        <button
          onClick={() => navigate('/setup')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Your First Agent
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Your Agents ({tokens.length})
        </h2>
        <button
          onClick={() => navigate('/setup')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Agent
        </button>
      </div>

      <div className="grid gap-4">
        {tokens.map((token) => (
          <AgentCard
            key={token.id}
            token={token}
            status={statuses[token.id] || 'offline'}
            onRevoke={handleRevoke}
          />
        ))}
      </div>
    </div>
  );
}
