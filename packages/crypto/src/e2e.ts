import nacl from 'tweetnacl';
import { decodeBase64, encodeBase64 } from './utils.js';

export interface EncryptedMessage {
  nonce: string; // Base64 encoded, 24 bytes
  ciphertext: string; // Base64 encoded
}

/**
 * End-to-end encryption handler using X25519 + XSalsa20-Poly1305.
 *
 * This class handles encrypted communication between desktop and mobile.
 * The relay server never sees the plaintext - it only forwards encrypted blobs.
 */
export class E2ECrypto {
  private sharedKey: Uint8Array;

  /**
   * Create an E2E crypto instance.
   *
   * @param mySecretKey - Your secret key (Base64 or Uint8Array)
   * @param peerPublicKey - Peer's public key (Base64 or Uint8Array)
   */
  constructor(
    mySecretKey: string | Uint8Array,
    peerPublicKey: string | Uint8Array
  ) {
    const secretKeyBytes =
      typeof mySecretKey === 'string' ? decodeBase64(mySecretKey) : mySecretKey;
    const publicKeyBytes =
      typeof peerPublicKey === 'string' ? decodeBase64(peerPublicKey) : peerPublicKey;

    // Derive the shared secret using X25519
    this.sharedKey = nacl.box.before(publicKeyBytes, secretKeyBytes);
  }

  /**
   * Encrypt a plaintext message.
   *
   * @param plaintext - The message to encrypt (string or Uint8Array)
   * @returns The encrypted message with nonce
   */
  encrypt(plaintext: string | Uint8Array): EncryptedMessage {
    const plaintextBytes =
      typeof plaintext === 'string' ? new TextEncoder().encode(plaintext) : plaintext;

    // Generate a random nonce (24 bytes for XSalsa20)
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    // Encrypt using the precomputed shared key
    const ciphertext = nacl.box.after(plaintextBytes, nonce, this.sharedKey);

    return {
      nonce: encodeBase64(nonce),
      ciphertext: encodeBase64(ciphertext),
    };
  }

  /**
   * Decrypt an encrypted message.
   *
   * @param encrypted - The encrypted message with nonce
   * @returns The decrypted plaintext string
   * @throws Error if decryption fails (invalid ciphertext or tampered message)
   */
  decrypt(encrypted: EncryptedMessage): string {
    const nonceBytes = decodeBase64(encrypted.nonce);
    const ciphertextBytes = decodeBase64(encrypted.ciphertext);

    // Decrypt using the precomputed shared key
    const plaintext = nacl.box.open.after(ciphertextBytes, nonceBytes, this.sharedKey);

    if (!plaintext) {
      throw new Error('Decryption failed: invalid ciphertext or tampered message');
    }

    return new TextDecoder().decode(plaintext);
  }

  /**
   * Decrypt an encrypted message to bytes.
   *
   * @param encrypted - The encrypted message with nonce
   * @returns The decrypted bytes
   * @throws Error if decryption fails
   */
  decryptBytes(encrypted: EncryptedMessage): Uint8Array {
    const nonceBytes = decodeBase64(encrypted.nonce);
    const ciphertextBytes = decodeBase64(encrypted.ciphertext);

    const plaintext = nacl.box.open.after(ciphertextBytes, nonceBytes, this.sharedKey);

    if (!plaintext) {
      throw new Error('Decryption failed: invalid ciphertext or tampered message');
    }

    return plaintext;
  }
}
