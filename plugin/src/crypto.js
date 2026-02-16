/**
 * Crypto utilities for HMAC signing and verification
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate HMAC-SHA256 signature
 * @param {string} secret - Secret key
 * @param {string} data - Data to sign
 * @returns {string} Hex-encoded signature
 */
function hmacSign(secret, data) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('hex');
}

/**
 * Verify HMAC-SHA256 signature
 * @param {string} secret - Secret key
 * @param {string} data - Data that was signed
 * @param {string} signature - Signature to verify
 * @returns {boolean} True if signature is valid
 */
function hmacVerify(secret, data, signature) {
  const expected = hmacSign(secret, data);
  // Check length first to avoid timingSafeEqual error
  if (expected.length !== signature.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch (e) {
    return false;
  }
}

/**
 * Generate a UUID v4 nonce
 * @returns {string} UUID
 */
function generateNonce() {
  return uuidv4();
}

/**
 * Validate timestamp is within acceptable range (5 minutes)
 * @param {number} timestamp - Timestamp to validate
 * @returns {boolean} True if timestamp is valid
 */
function validateTimestamp(timestamp) {
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  const MAX_DRIFT = 5 * 60 * 1000; // 5 minutes
  return diff < MAX_DRIFT;
}

/**
 * Sign an auth message
 * @param {string} tokenId - Token ID
 * @param {string} tokenSecret - Token secret
 * @param {number} timestamp - Timestamp
 * @returns {string} Signature
 */
function signAuth(tokenId, tokenSecret, timestamp) {
  return hmacSign(tokenSecret, `${tokenId}:${timestamp}`);
}

/**
 * Sign a message
 * @param {string} tokenSecret - Token secret
 * @param {string} sessionId - Session ID
 * @param {string} content - Message content
 * @param {string} nonce - Nonce
 * @param {number} timestamp - Timestamp
 * @returns {string} Signature
 */
function signMessage(tokenSecret, sessionId, content, nonce, timestamp) {
  const data = `${sessionId}:${content}:${nonce}:${timestamp}`;
  return hmacSign(tokenSecret, data);
}

module.exports = {
  hmacSign,
  hmacVerify,
  generateNonce,
  validateTimestamp,
  signAuth,
  signMessage
};
