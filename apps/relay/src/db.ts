/**
 * DynamoDB operations for session and connection management.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { MessageEnvelope } from '@doomcode/protocol';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!;
const SESSIONS_TABLE = process.env.SESSIONS_TABLE!;
const MESSAGES_TABLE = process.env.MESSAGES_TABLE!;

export interface Connection {
  connectionId: string;
  sessionId: string;
  clientType: 'desktop' | 'mobile';
  publicKey: string;
  connectedAt: number;
}

export interface Session {
  sessionId: string;
  desktopConnectionId?: string;
  desktopPublicKey?: string;
  mobileConnectionId?: string;
  mobilePublicKey?: string;
  createdAt: number;
  expiresAt: number;
}

export interface QueuedMessage {
  sessionId: string;
  messageId: string;
  envelope: MessageEnvelope;
  queuedAt: number;
  ttl: number;
}

// ============================================================================
// Connection operations
// ============================================================================

export async function saveConnection(connection: Connection): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: CONNECTIONS_TABLE,
      Item: connection,
    })
  );
}

export async function getConnection(connectionId: string): Promise<Connection | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId },
    })
  );
  return (result.Item as Connection) || null;
}

export async function deleteConnection(connectionId: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId },
    })
  );
}

// ============================================================================
// Session operations
// ============================================================================

export async function createSession(sessionId: string): Promise<Session> {
  const now = Date.now();
  const session: Session = {
    sessionId,
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
  };

  await docClient.send(
    new PutCommand({
      TableName: SESSIONS_TABLE,
      Item: {
        ...session,
        ttl: Math.floor(session.expiresAt / 1000),
      },
    })
  );

  return session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: SESSIONS_TABLE,
      Key: { sessionId },
    })
  );
  return (result.Item as Session) || null;
}

export async function updateSessionClient(
  sessionId: string,
  clientType: 'desktop' | 'mobile',
  connectionId: string,
  publicKey: string
): Promise<void> {
  const updateExpr =
    clientType === 'desktop'
      ? 'SET desktopConnectionId = :connId, desktopPublicKey = :pubKey'
      : 'SET mobileConnectionId = :connId, mobilePublicKey = :pubKey';

  await docClient.send(
    new UpdateCommand({
      TableName: SESSIONS_TABLE,
      Key: { sessionId },
      UpdateExpression: updateExpr,
      ExpressionAttributeValues: {
        ':connId': connectionId,
        ':pubKey': publicKey,
      },
    })
  );
}

export async function clearSessionClient(
  sessionId: string,
  clientType: 'desktop' | 'mobile'
): Promise<void> {
  const updateExpr =
    clientType === 'desktop'
      ? 'REMOVE desktopConnectionId, desktopPublicKey'
      : 'REMOVE mobileConnectionId, mobilePublicKey';

  await docClient.send(
    new UpdateCommand({
      TableName: SESSIONS_TABLE,
      Key: { sessionId },
      UpdateExpression: updateExpr,
    })
  );
}

// ============================================================================
// Message queue operations (for offline support)
// ============================================================================

export async function queueMessage(
  sessionId: string,
  envelope: MessageEnvelope
): Promise<void> {
  const item: QueuedMessage = {
    sessionId,
    messageId: envelope.messageId,
    envelope,
    queuedAt: Date.now(),
    ttl: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hour TTL
  };

  await docClient.send(
    new PutCommand({
      TableName: MESSAGES_TABLE,
      Item: item,
    })
  );
}

export async function getQueuedMessages(sessionId: string): Promise<QueuedMessage[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: MESSAGES_TABLE,
      KeyConditionExpression: 'sessionId = :sid',
      ExpressionAttributeValues: {
        ':sid': sessionId,
      },
      ScanIndexForward: true, // Oldest first
    })
  );

  return (result.Items as QueuedMessage[]) || [];
}

export async function deleteQueuedMessages(
  sessionId: string,
  upToMessageId: string
): Promise<void> {
  const messages = await getQueuedMessages(sessionId);
  const index = messages.findIndex((m) => m.messageId === upToMessageId);

  if (index === -1) return;

  // Delete all messages up to and including the acked one
  const toDelete = messages.slice(0, index + 1);

  for (const msg of toDelete) {
    await docClient.send(
      new DeleteCommand({
        TableName: MESSAGES_TABLE,
        Key: {
          sessionId: msg.sessionId,
          messageId: msg.messageId,
        },
      })
    );
  }
}

/**
 * Delete all queued messages for a session.
 * Useful when the mobile public key changes (old queued messages will be undecryptable).
 */
export async function clearAllQueuedMessages(sessionId: string): Promise<void> {
  const messages = await getQueuedMessages(sessionId);
  for (const msg of messages) {
    await docClient.send(
      new DeleteCommand({
        TableName: MESSAGES_TABLE,
        Key: {
          sessionId: msg.sessionId,
          messageId: msg.messageId,
        },
      })
    );
  }
}
