/**
 * $disconnect handler - called when a WebSocket connection is closed.
 */

import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import {
  getConnection,
  deleteConnection,
  getSession,
  clearSessionClient,
} from '../db.js';
import { sendToConnection } from '../websocket.js';

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  console.log(`Connection closed: ${connectionId}`);

  try {
    // Get connection info
    const connection = await getConnection(connectionId);
    if (!connection) {
      return { statusCode: 200, body: 'OK' };
    }

    // Get session to notify peer
    const session = await getSession(connection.sessionId);
    if (session) {
      // Notify peer of disconnection
      const peerConnectionId =
        connection.clientType === 'desktop'
          ? session.mobileConnectionId
          : session.desktopConnectionId;

      if (peerConnectionId) {
        await sendToConnection(
          event.requestContext.domainName!,
          event.requestContext.stage,
          peerConnectionId,
          {
            action: 'peer_disconnected',
            peerType: connection.clientType,
          }
        );
      }

      // Clear from session
      await clearSessionClient(connection.sessionId, connection.clientType);
    }

    // Delete connection record
    await deleteConnection(connectionId);
  } catch (error) {
    console.error('Error in disconnect handler:', error);
  }

  return {
    statusCode: 200,
    body: 'Disconnected',
  };
};
