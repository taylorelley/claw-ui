import { supabase } from '../lib/supabase';
import { generateToken, hashToken } from '../lib/tokens';

export interface AgentToken {
  id: string;
  user_id: string;
  name: string;
  token_hash: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface CreateTokenResult {
  token: AgentToken;
  plainToken: string; // Only returned once!
}

/**
 * Create a new agent token
 * @param name - Friendly name for the agent (e.g., "Home Server")
 * @returns The token record and the plain token (shown only once)
 */
export async function createAgentToken(name: string): Promise<CreateTokenResult> {
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Not authenticated');
  }

  // Generate token and hash
  const plainToken = generateToken();
  const tokenHash = await hashToken(plainToken);

  // Insert into database
  const { data, error } = await supabase
    .from('agent_tokens')
    .insert({
      user_id: user.id,
      name,
      token_hash: tokenHash,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating agent token:', error);
    throw new Error('Failed to create agent token');
  }

  return {
    token: data,
    plainToken,
  };
}

/**
 * List all agent tokens for the current user
 * @returns Array of agent tokens (without hashes)
 */
export async function listAgentTokens(): Promise<AgentToken[]> {
  const { data, error } = await supabase
    .from('agent_tokens')
    .select('*')
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error listing agent tokens:', error);
    throw new Error('Failed to list agent tokens');
  }

  return data || [];
}

/**
 * Revoke an agent token (soft delete)
 * @param id - The token ID to revoke
 */
export async function revokeAgentToken(id: string): Promise<void> {
  const { error } = await supabase
    .from('agent_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error revoking agent token:', error);
    throw new Error('Failed to revoke agent token');
  }
}

/**
 * Get agent connection status
 * @param tokenId - The token ID to check
 * @returns Connection status (placeholder - will be implemented with relay)
 */
export async function getAgentStatus(tokenId: string): Promise<'online' | 'offline'> {
  // TODO: Implement real-time status check via relay
  // For now, check last_used_at timestamp
  const { data, error } = await supabase
    .from('agent_tokens')
    .select('last_used_at')
    .eq('id', tokenId)
    .single();

  if (error || !data) {
    return 'offline';
  }

  if (!data.last_used_at) {
    return 'offline';
  }

  // Consider online if used in last 5 minutes
  const lastUsed = new Date(data.last_used_at).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  return (now - lastUsed) < fiveMinutes ? 'online' : 'offline';
}
