import { supabase } from '../lib/supabase';
import { generateTokenSecret, generateTokenId } from '../lib/tokens';

export interface AgentToken {
  id: string;
  token_id: string;
  user_id: string;
  name: string;
  token_secret: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
}

export interface CreateTokenResult {
  token: AgentToken;
  tokenId: string; // UUID for identification
  tokenSecret: string; // Secret for HMAC signing (only returned once!)
}

/**
 * Create a new agent token with HMAC credentials
 * @param name - Friendly name for the agent (e.g., "Home Server")
 * @returns The token record, token ID, and token secret (secret shown only once)
 */
export async function createAgentToken(name: string): Promise<CreateTokenResult> {
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Not authenticated');
  }

  // Generate token ID (UUID) and secret (for HMAC)
  const tokenId = generateTokenId();
  const tokenSecret = generateTokenSecret();

  // Insert into database
  const { data, error } = await supabase
    .from('agent_tokens')
    .insert({
      token_id: tokenId,
      user_id: user.id,
      name,
      token_secret: tokenSecret,
      expires_at: null, // Never expires by default
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating agent token:', error);
    throw new Error('Failed to create agent token');
  }

  return {
    token: data,
    tokenId,
    tokenSecret,
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
 * @param id - The database ID (not token_id) to check
 * @returns Connection status (placeholder - will be implemented with relay)
 */
export async function getAgentStatus(id: string): Promise<'online' | 'offline'> {
  // TODO: Implement real-time status check via relay
  // For now, check last_used_at timestamp
  const { data, error } = await supabase
    .from('agent_tokens')
    .select('last_used_at')
    .eq('id', id)
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
