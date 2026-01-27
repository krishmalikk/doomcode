/**
 * $connect handler - called when a WebSocket connection is established.
 */

import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  console.log(`Connection established: ${connectionId}`);

  // Connection is established but not yet associated with a session.
  // The client will send a 'join' message to associate with a session.

  return {
    statusCode: 200,
    body: 'Connected',
  };
};
