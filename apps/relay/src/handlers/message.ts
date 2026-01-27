/**
 * $default handler - handles all WebSocket messages.
 */

import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { randomUUID } from 'crypto';
import type {
  RelayClientMessage,
  MessageEnvelope,
} from '@doomcode/protocol';
import {
  saveConnection,
  getConnection,
  deleteConnection,
  createSession,
  getSession,
  updateSessionClient,
  clearSessionClient,
  queueMessage,
  getQueuedMessages,
  deleteQueuedMessages,
  clearAllQueuedMessages,
} from '../db.js';
import { sendToConnection } from '../websocket.js';

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const domain = event.requestContext.domainName!;
  const stage = event.requestContext.stage;

  if (!event.body) {
    return { statusCode: 400, body: 'Empty message' };
  }

  try {
    const data = JSON.parse(event.body);

    // Check if this is a control message or encrypted envelope
    if ('action' in data) {
      await handleControlMessage(domain, stage, connectionId, data as RelayClientMessage);
    } else if ('encryptedPayload' in data) {
      await handleEncryptedMessage(domain, stage, connectionId, data as MessageEnvelope);
    }

    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('Error handling message:', error);
    await sendToConnection(domain, stage, connectionId, {
      action: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to process message',
    });
    return { statusCode: 500, body: 'Error' };
  }
};

async function handleControlMessage(
  domain: string,
  stage: string,
  connectionId: string,
  msg: RelayClientMessage
): Promise<void> {
  switch (msg.action) {
    case 'create':
      await handleCreate(domain, stage, connectionId, msg.publicKey);
      break;

    case 'join':
      await handleJoin(domain, stage, connectionId, msg.sessionId, msg.clientType, msg.publicKey);
      break;

    case 'leave':
      // Handled by disconnect
      break;

    case 'queue_status':
      await handleQueueStatus(domain, stage, connectionId, msg.sessionId);
      break;

    case 'ack':
      await deleteQueuedMessages(msg.sessionId, msg.lastMessageId);
      break;
  }
}

async function handleCreate(
  domain: string,
  stage: string,
  connectionId: string,
  publicKey: string
): Promise<void> {
  const sessionId = randomUUID();

  // Create session
  await createSession(sessionId);

  // Save connection
  await saveConnection({
    connectionId,
    sessionId,
    clientType: 'desktop',
    publicKey,
    connectedAt: Date.now(),
  });

  // Update session with desktop info
  await updateSessionClient(sessionId, 'desktop', connectionId, publicKey);

  // Send confirmation
  await sendToConnection(domain, stage, connectionId, {
    action: 'session_created',
    sessionId,
  });
}

async function handleJoin(
  domain: string,
  stage: string,
  connectionId: string,
  sessionId: string,
  clientType: 'desktop' | 'mobile',
  publicKey: string
): Promise<void> {
  // Check session exists
  const session = await getSession(sessionId);
  if (!session) {
    await sendToConnection(domain, stage, connectionId, {
      action: 'error',
      code: 'SESSION_NOT_FOUND',
      message: 'Session does not exist',
    });
    return;
  }

  // If the mobile public key changes (common after reinstall/re-pair), any queued
  // messages from the old key are undecryptable. Drop them to avoid decrypt errors.
  if (clientType === 'mobile' && session.mobilePublicKey && session.mobilePublicKey !== publicKey) {
    await clearAllQueuedMessages(sessionId);
  }

  // Check if this client type is already connected
  const existingConnectionId =
    clientType === 'desktop' ? session.desktopConnectionId : session.mobileConnectionId;
  if (existingConnectionId) {
    // If the recorded connection is stale (common when apps are killed / networks drop),
    // API Gateway will return GoneException when we try to send.
    // In that case, clear the session slot so the client can re-join immediately.
    const isAlive = await sendToConnection(domain, stage, existingConnectionId, {
      action: 'ping',
      timestamp: Date.now(),
    });

    if (!isAlive) {
      await clearSessionClient(sessionId, clientType);
      await deleteConnection(existingConnectionId);
      // Continue to allow this join
    } else {
    await sendToConnection(domain, stage, connectionId, {
      action: 'error',
      code: 'ALREADY_CONNECTED',
      message: `A ${clientType} is already connected to this session`,
    });
    return;
    }
  }

  // Save connection
  await saveConnection({
    connectionId,
    sessionId,
    clientType,
    publicKey,
    connectedAt: Date.now(),
  });

  // Update session
  await updateSessionClient(sessionId, clientType, connectionId, publicKey);

  // Get peer's public key if available
  const peerPublicKey =
    clientType === 'desktop' ? session.mobilePublicKey : session.desktopPublicKey;

  // Send join confirmation
  await sendToConnection(domain, stage, connectionId, {
    action: 'session_joined',
    sessionId,
    peerPublicKey,
  });

  // Notify peer if connected
  const peerConnectionId =
    clientType === 'desktop' ? session.mobileConnectionId : session.desktopConnectionId;

  if (peerConnectionId) {
    await sendToConnection(domain, stage, peerConnectionId, {
      action: 'peer_connected',
      peerPublicKey: publicKey,
      peerType: clientType,
    });
  }

  // If mobile reconnecting, send queue status and replay messages
  if (clientType === 'mobile') {
    const queuedMessages = await getQueuedMessages(sessionId);
    if (queuedMessages.length > 0) {
      await sendToConnection(domain, stage, connectionId, {
        action: 'queue_status',
        queuedMessages: queuedMessages.length,
        oldestTimestamp: queuedMessages[0]?.queuedAt,
      });

      // Replay messages
      for (const msg of queuedMessages) {
        await sendToConnection(domain, stage, connectionId, msg.envelope);
      }
    }
  }
}

async function handleQueueStatus(
  domain: string,
  stage: string,
  connectionId: string,
  sessionId: string
): Promise<void> {
  const messages = await getQueuedMessages(sessionId);
  await sendToConnection(domain, stage, connectionId, {
    action: 'queue_status',
    queuedMessages: messages.length,
    oldestTimestamp: messages[0]?.queuedAt,
  });
}

async function handleEncryptedMessage(
  domain: string,
  stage: string,
  connectionId: string,
  envelope: MessageEnvelope
): Promise<void> {
  // Get sender connection info
  const connection = await getConnection(connectionId);
  if (!connection) {
    await sendToConnection(domain, stage, connectionId, {
      action: 'error',
      code: 'NOT_JOINED',
      message: 'Must join a session first',
    });
    return;
  }

  // Get session
  const session = await getSession(connection.sessionId);
  if (!session) {
    return;
  }

  // Find peer connection
  const peerConnectionId =
    connection.clientType === 'desktop'
      ? session.mobileConnectionId
      : session.desktopConnectionId;

  if (peerConnectionId) {
    // Forward to peer
    await sendToConnection(domain, stage, peerConnectionId, envelope);
  } else if (connection.clientType === 'desktop') {
    // Mobile offline - queue the message
    await queueMessage(connection.sessionId, envelope);
  }
  // Messages from mobile when desktop is offline are dropped
}
