/**
 * Relay server protocol messages.
 * These are NOT encrypted - they're for session management only.
 */

// ============================================================================
// Client -> Relay
// ============================================================================

export interface RelayJoinSession {
  action: 'join';
  sessionId: string;
  clientType: 'desktop' | 'mobile';
  publicKey: string;
}

export interface RelayCreateSession {
  action: 'create';
  publicKey: string;
}

export interface RelayLeaveSession {
  action: 'leave';
  sessionId: string;
}

export interface RelayGetQueueStatus {
  action: 'queue_status';
  sessionId: string;
}

export interface RelayAckMessages {
  action: 'ack';
  sessionId: string;
  lastMessageId: string;
}

export type RelayClientMessage =
  | RelayJoinSession
  | RelayCreateSession
  | RelayLeaveSession
  | RelayGetQueueStatus
  | RelayAckMessages;

// ============================================================================
// Relay -> Client
// ============================================================================

export interface RelaySessionCreated {
  action: 'session_created';
  sessionId: string;
}

export interface RelaySessionJoined {
  action: 'session_joined';
  sessionId: string;
  peerPublicKey?: string;
}

export interface RelayPeerConnected {
  action: 'peer_connected';
  peerPublicKey: string;
  peerType: 'desktop' | 'mobile';
}

export interface RelayPeerDisconnected {
  action: 'peer_disconnected';
  peerType: 'desktop' | 'mobile';
}

export interface RelayQueueStatus {
  action: 'queue_status';
  queuedMessages: number;
  oldestTimestamp?: number;
}

export interface RelayError {
  action: 'error';
  code: string;
  message: string;
}

export type RelayServerMessage =
  | RelaySessionCreated
  | RelaySessionJoined
  | RelayPeerConnected
  | RelayPeerDisconnected
  | RelayQueueStatus
  | RelayError;

// ============================================================================
// QR Code Payload
// ============================================================================

export interface QRCodePayload {
  sessionId: string;
  publicKey: string;
  relayUrl: string;
  expiresAt: number;
}

export function encodeQRPayload(payload: QRCodePayload): string {
  return JSON.stringify(payload);
}

export function decodeQRPayload(data: string): QRCodePayload | null {
  try {
    const parsed = JSON.parse(data);
    if (
      typeof parsed.sessionId === 'string' &&
      typeof parsed.publicKey === 'string' &&
      typeof parsed.relayUrl === 'string' &&
      typeof parsed.expiresAt === 'number'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
