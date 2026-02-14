import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AgentToken } from './types.js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';

let supabase: SupabaseClient | null = null;

// Initialize Supabase client (graceful fallback if not configured)
export function initSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('⚠️  Supabase not configured - auth will fail');
    return null;
  }
  
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log('✅ Supabase client initialized');
    return supabase;
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
    return null;
  }
}

/**
 * Verify agent token and return token info
 */
export async function verifyAgentToken(
  tokenId: string,
  signature: string,
  payload: string
): Promise<{ valid: boolean; token?: AgentToken; error?: string }> {
  if (!supabase) {
    return { valid: false, error: 'Database not available' };
  }

  try {
    // Fetch token from database by token_id (UUID), not database id
    const { data: token, error } = await supabase
      .from('agent_tokens')
      .select('*')
      .eq('token_id', tokenId)
      .is('revoked_at', null)
      .single();

    if (error || !token) {
      return { valid: false, error: 'Token not found' };
    }

    // Check if token is expired
    if (token.expires_at && new Date(token.expires_at) < new Date()) {
      return { valid: false, error: 'Token expired' };
    }

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', token.token_secret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Update last_used_at
    await supabase
      .from('agent_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenId);

    return { valid: true, token };
  } catch (error) {
    console.error('Error verifying agent token:', error);
    return { valid: false, error: 'Verification failed' };
  }
}

/**
 * Verify message signature with replay protection
 */
export function verifyMessageSignature(
  tokenSecret: string,
  content: string,
  nonce: string,
  timestamp: number,
  signature: string
): { valid: boolean; error?: string } {
  // Check timestamp is within ±5 minutes
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  if (Math.abs(now - timestamp) > fiveMinutes) {
    return { valid: false, error: 'Timestamp out of range' };
  }

  // Verify signature
  const payload = `${content}:${nonce}:${timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', tokenSecret)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true };
}

/**
 * Verify Supabase JWT token
 */
export function verifyClientJWT(token: string): {
  valid: boolean;
  userId?: string;
  error?: string;
} {
  if (!SUPABASE_JWT_SECRET) {
    return { valid: false, error: 'JWT secret not configured' };
  }

  try {
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET) as any;
    
    if (!decoded.sub) {
      return { valid: false, error: 'Invalid token payload' };
    }

    return { valid: true, userId: decoded.sub };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, error: 'Token expired' };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { valid: false, error: 'Invalid token' };
    }
    return { valid: false, error: 'Token verification failed' };
  }
}

/**
 * Update agent connection status in database
 */
export async function updateAgentConnectionStatus(
  userId: string,
  tokenId: string,
  online: boolean
): Promise<void> {
  if (!supabase) return;

  try {
    const timestamp = new Date().toISOString();
    
    if (online) {
      // Insert or update connection record
      await supabase.from('agent_connections').upsert({
        user_id: userId,
        agent_token_id: tokenId,
        connected_at: timestamp,
        last_seen_at: timestamp,
      });
    } else {
      // Update last_seen_at and mark as disconnected
      await supabase
        .from('agent_connections')
        .update({
          last_seen_at: timestamp,
          disconnected_at: timestamp,
        })
        .eq('user_id', userId)
        .eq('agent_token_id', tokenId);
    }
  } catch (error) {
    console.error('Error updating connection status:', error);
  }
}

/**
 * Update last_seen_at for active connection
 */
export async function updateLastSeen(userId: string, tokenId: string): Promise<void> {
  if (!supabase) return;

  try {
    await supabase
      .from('agent_connections')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('agent_token_id', tokenId);
  } catch (error) {
    console.error('Error updating last_seen:', error);
  }
}
