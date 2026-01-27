/**
 * Wire envelope format for DoomCode messages.
 * The relay server only sees the envelope - never the decrypted content.
 */

export type Sender = 'desktop' | 'mobile';

export interface MessageEnvelope {
  version: 1;
  sessionId: string;
  messageId: string;
  timestamp: number;
  sender: Sender;
  nonce: string;
  encryptedPayload: string;
}

/**
 * Generate a UUID that works in both Node.js and React Native.
 */
function generateUUID(): string {
  // Use crypto.randomUUID if available (Node.js 19+, modern browsers)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for React Native and older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create a message envelope for transmission.
 */
export function createEnvelope(params: {
  sessionId: string;
  sender: Sender;
  nonce: string;
  encryptedPayload: string;
}): MessageEnvelope {
  return {
    version: 1,
    sessionId: params.sessionId,
    messageId: generateUUID(),
    timestamp: Date.now(),
    sender: params.sender,
    nonce: params.nonce,
    encryptedPayload: params.encryptedPayload,
  };
}

/**
 * Validate that an object is a valid MessageEnvelope.
 */
export function isValidEnvelope(obj: unknown): obj is MessageEnvelope {
  if (typeof obj !== 'object' || obj === null) return false;

  const envelope = obj as Record<string, unknown>;

  return (
    envelope.version === 1 &&
    typeof envelope.sessionId === 'string' &&
    typeof envelope.messageId === 'string' &&
    typeof envelope.timestamp === 'number' &&
    (envelope.sender === 'desktop' || envelope.sender === 'mobile') &&
    typeof envelope.nonce === 'string' &&
    typeof envelope.encryptedPayload === 'string'
  );
}
