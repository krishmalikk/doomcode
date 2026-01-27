/**
 * HTTP handlers for session management and health checks.
 */

import type { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { createSession, getSession } from '../db.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export const createSessionHandler: APIGatewayProxyHandlerV2 = async (): Promise<APIGatewayProxyResultV2> => {
  try {
    const sessionId = randomUUID();
    await createSession(sessionId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ sessionId }),
    };
  } catch (error) {
    console.error('Error creating session:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create session' }),
    };
  }
};

export const getSessionHandler: APIGatewayProxyHandlerV2 = async (event): Promise<APIGatewayProxyResultV2> => {
  const sessionId = event.pathParameters?.sessionId;

  if (!sessionId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Session ID required' }),
    };
  }

  try {
    const session = await getSession(sessionId);

    if (!session) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Session not found' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sessionId: session.sessionId,
        hasDesktop: !!session.desktopConnectionId,
        hasMobile: !!session.mobileConnectionId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      }),
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get session' }),
    };
  }
};

export const healthHandler: APIGatewayProxyHandlerV2 = async (): Promise<APIGatewayProxyResultV2> => {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ status: 'ok', timestamp: Date.now() }),
  };
};
