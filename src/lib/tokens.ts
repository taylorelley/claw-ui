import bcrypt from 'bcryptjs';

/**
 * Generate a cryptographically random 256-bit token
 * Returns a base64-encoded string (43 characters)
 */
export function generateToken(): string {
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
 * Hash a token using bcrypt
 * @param token - The plain token to hash
 * @returns Promise resolving to the bcrypt hash
 */
export async function hashToken(token: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(token, saltRounds);
}

/**
 * Verify a token against a hash
 * @param token - The plain token to verify
 * @param hash - The bcrypt hash to compare against
 * @returns Promise resolving to true if match, false otherwise
 */
export async function verifyToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}
