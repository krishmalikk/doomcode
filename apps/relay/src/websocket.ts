/**
 * WebSocket utilities for sending messages via API Gateway Management API.
 */

import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from '@aws-sdk/client-apigatewaymanagementapi';

const clients = new Map<string, ApiGatewayManagementApiClient>();

function getClient(domain: string, stage: string): ApiGatewayManagementApiClient {
  const endpoint = `https://${domain}/${stage}`;

  if (!clients.has(endpoint)) {
    clients.set(
      endpoint,
      new ApiGatewayManagementApiClient({
        endpoint,
      })
    );
  }

  return clients.get(endpoint)!;
}

export async function sendToConnection(
  domain: string,
  stage: string,
  connectionId: string,
  data: unknown
): Promise<boolean> {
  const client = getClient(domain, stage);

  try {
    await client.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify(data),
      })
    );
    return true;
  } catch (error) {
    if (error instanceof GoneException) {
      // Connection is stale - client disconnected
      console.log(`Connection ${connectionId} is gone`);
      return false;
    }
    throw error;
  }
}
