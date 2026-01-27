import nacl from 'tweetnacl';
import { encodeBase64 } from './utils.js';

export interface KeyPair {
  publicKey: string; // Base64 encoded
  secretKey: string; // Base64 encoded
  publicKeyBytes: Uint8Array;
  secretKeyBytes: Uint8Array;
}

/**
 * Generate a new X25519 key pair for E2E encryption.
 * The public key is shared via QR code, the secret key stays on device.
 */
export function generateKeyPair(): KeyPair {
  const keyPair = nacl.box.keyPair();

  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
    publicKeyBytes: keyPair.publicKey,
    secretKeyBytes: keyPair.secretKey,
  };
}
