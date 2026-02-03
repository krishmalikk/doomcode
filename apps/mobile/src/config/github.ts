export const GITHUB_CONFIG = {
  clientId: process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || '',
  redirectUri: 'doomcode://github/callback',
  scopes: ['repo', 'read:user'],
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
};
