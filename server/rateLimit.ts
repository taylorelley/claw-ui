import { RateLimitEntry } from './types.js';

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_MESSAGES = 60; // 60 messages per minute

// Map: identifier (userId or IP) -> RateLimitEntry
const rateLimits = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [key, entry] of rateLimits.entries()) {
    if (entry.resetAt < now) {
      rateLimits.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if identifier is rate limited
 * @param identifier User ID or IP address
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(identifier: string): boolean {
  const now = new Date();
  const entry = rateLimits.get(identifier);

  if (!entry || entry.resetAt < now) {
    // Create new entry
    rateLimits.set(identifier, {
      count: 1,
      resetAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS),
    });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_MESSAGES) {
    return false; // Rate limited
  }

  // Increment counter
  entry.count++;
  return true;
}

/**
 * Get remaining messages in current window
 */
export function getRateLimitStatus(identifier: string): {
  remaining: number;
  resetAt: Date;
} {
  const now = new Date();
  const entry = rateLimits.get(identifier);

  if (!entry || entry.resetAt < now) {
    return {
      remaining: RATE_LIMIT_MAX_MESSAGES,
      resetAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS),
    };
  }

  return {
    remaining: Math.max(0, RATE_LIMIT_MAX_MESSAGES - entry.count),
    resetAt: entry.resetAt,
  };
}
