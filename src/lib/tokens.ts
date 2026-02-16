/**
 * Generate a cryptographically random token secret for HMAC
 * Returns a base64-encoded string (43 characters)
 */
export function generateTokenSecret(): string {
  // Generate 32 random bytes (256 bits)
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  
  // Convert to base64 (URL-safe variant)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a UUID v4 for token ID
 * @returns A UUID string
 */
export function generateTokenId(): string {
  return crypto.randomUUID();
}
