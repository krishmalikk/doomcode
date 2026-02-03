import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { GITHUB_CONFIG } from '../config/github';

// Enable the web browser session to be completed
WebBrowser.maybeCompleteAuthSession();

interface OAuthResult {
  success: boolean;
  accessToken?: string;
  scope?: string;
  error?: string;
}

export async function initiateGitHubOAuth(): Promise<OAuthResult> {
  if (!GITHUB_CONFIG.clientId) {
    return { success: false, error: 'GitHub Client ID not configured' };
  }

  const state = await generateRandomState();

  const authUrl = new URL(GITHUB_CONFIG.authorizationEndpoint);
  authUrl.searchParams.set('client_id', GITHUB_CONFIG.clientId);
  authUrl.searchParams.set('redirect_uri', GITHUB_CONFIG.redirectUri);
  authUrl.searchParams.set('scope', GITHUB_CONFIG.scopes.join(' '));
  authUrl.searchParams.set('state', state);

  try {
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl.toString(),
      GITHUB_CONFIG.redirectUri
    );

    if (result.type === 'success' && result.url) {
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        return { success: false, error: `GitHub error: ${error}` };
      }

      if (returnedState !== state) {
        return { success: false, error: 'State mismatch - possible CSRF attack' };
      }

      if (code) {
        return await exchangeCodeForToken(code);
      }
    }

    if (result.type === 'cancel') {
      return { success: false, error: 'Authentication cancelled' };
    }

    return { success: false, error: 'OAuth flow failed' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function exchangeCodeForToken(code: string): Promise<OAuthResult> {
  // For mobile OAuth, we need a backend proxy since client_secret
  // shouldn't be embedded in the app. You have two options:
  //
  // Option 1: Use your own backend proxy
  // Option 2: Use GitHub's Device Flow (doesn't need client_secret)
  //
  // For now, we'll use a simple proxy endpoint that you'll need to set up.
  // This could be a serverless function (Vercel, AWS Lambda, etc.)

  const proxyUrl = process.env.EXPO_PUBLIC_GITHUB_TOKEN_PROXY_URL;

  if (!proxyUrl) {
    // Fallback: Return the code and let the desktop handle the exchange
    // The desktop has access to the client_secret via environment
    return {
      success: true,
      accessToken: `code:${code}`, // Desktop will exchange this
      scope: GITHUB_CONFIG.scopes.join(' '),
    };
  }

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        redirect_uri: GITHUB_CONFIG.redirectUri,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Token exchange failed (${response.status})`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      accessToken: data.access_token,
      scope: data.scope,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token exchange failed',
    };
  }
}

async function generateRandomState(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function fetchGitHubUser(accessToken: string) {
  // Handle the case where we got a code instead of token
  if (accessToken.startsWith('code:')) {
    throw new Error('Token not yet exchanged - connect to desktop first');
  }

  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  const data = await response.json();
  return {
    login: data.login as string,
    avatarUrl: data.avatar_url as string,
    name: data.name as string | undefined,
  };
}

export async function revokeGitHubToken(accessToken: string): Promise<boolean> {
  // GitHub doesn't have a simple token revocation API for OAuth apps
  // The token remains valid until it expires or is manually revoked
  // from GitHub settings. We just clear it locally.
  return true;
}
