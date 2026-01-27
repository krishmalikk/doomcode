#!/usr/bin/env node
/**
 * DoomCode Desktop CLI
 *
 * Wraps Claude Code CLI and streams output to mobile via relay server.
 */

import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { decodeBase64, type KeyPair } from '@doomcode/crypto';
import { DoomCodeSession } from './session.js';

const SUPPORTED_AGENTS = ['claude', 'codex', 'gemini'] as const;
type SupportedAgent = (typeof SUPPORTED_AGENTS)[number];

const normalizeAgentOption = (agent: string): SupportedAgent => {
  const normalized = agent.toLowerCase().trim();
  if ((SUPPORTED_AGENTS as readonly string[]).includes(normalized)) {
    return normalized as SupportedAgent;
  }
  console.error(`Unsupported agent "${agent}". Use one of: ${SUPPORTED_AGENTS.join(', ')}`);
  process.exit(1);
};

// AWS API Gateway URLs
const DEFAULT_WS_URL = 'wss://elz7wfhx70.execute-api.us-east-1.amazonaws.com/prod';
const DEFAULT_HTTP_URL = 'https://jsmutqne72.execute-api.us-east-1.amazonaws.com/prod';

const getSessionCachePath = (dir: string) => path.join(dir, '.doomcode', 'session.json');

const loadSessionCache = (cachePath: string) => {
  if (!fs.existsSync(cachePath)) return null;
  try {
    const raw = fs.readFileSync(cachePath, 'utf8');
    const parsed = JSON.parse(raw) as {
      sessionId?: string;
      wsUrl?: string;
      httpUrl?: string;
      keyPair?: { publicKey?: string; secretKey?: string };
    };

    if (!parsed.sessionId || !parsed.keyPair?.publicKey || !parsed.keyPair?.secretKey) {
      return null;
    }

    const keyPair: KeyPair = {
      publicKey: parsed.keyPair.publicKey,
      secretKey: parsed.keyPair.secretKey,
      publicKeyBytes: decodeBase64(parsed.keyPair.publicKey),
      secretKeyBytes: decodeBase64(parsed.keyPair.secretKey),
    };

    return {
      sessionId: parsed.sessionId,
      wsUrl: parsed.wsUrl,
      httpUrl: parsed.httpUrl,
      keyPair,
    };
  } catch {
    return null;
  }
};

program
  .name('doomcode')
  .description('Control AI coding agents from your phone')
  .version('0.1.0');

program
  .command('start')
  .description('Start a DoomCode session')
  .option('--ws-url <url>', 'WebSocket relay URL', DEFAULT_WS_URL)
  .option('--http-url <url>', 'HTTP API URL for session management', DEFAULT_HTTP_URL)
  .option('-d, --dir <path>', 'Working directory', process.cwd())
  .option('-a, --agent <agent>', 'Agent to use (claude|codex|gemini)', 'claude')
  .option('--reuse', 'Reuse the last session from the local cache')
  .action(async (options) => {
    const agent = normalizeAgentOption(options.agent);
    const cachePath = getSessionCachePath(options.dir);

    if (options.reuse) {
      const cached = loadSessionCache(cachePath);
      if (cached) {
        const session = new DoomCodeSession({
          wsUrl: cached.wsUrl ?? options.wsUrl,
          httpUrl: cached.httpUrl ?? options.httpUrl,
          workingDirectory: options.dir,
          agent,
          sessionId: cached.sessionId,
          keyPair: cached.keyPair,
          sessionCachePath: cachePath,
        });

        try {
          await session.connect();
          return;
        } catch (error) {
          console.error('Failed to reuse session, falling back to new session:', error);
        }
      } else {
        console.warn('No reusable session cache found; starting a new session.');
      }
    }

    const session = new DoomCodeSession({
      wsUrl: options.wsUrl,
      httpUrl: options.httpUrl,
      workingDirectory: options.dir,
      agent,
      sessionCachePath: cachePath,
    });

    try {
      await session.start();
    } catch (error) {
      console.error('Failed to start session:', error);
      process.exit(1);
    }
  });

program
  .command('connect <session-id>')
  .description('Connect to an existing session')
  .option('--ws-url <url>', 'WebSocket relay URL', DEFAULT_WS_URL)
  .option('--http-url <url>', 'HTTP API URL for session management', DEFAULT_HTTP_URL)
  .option('-a, --agent <agent>', 'Agent to use (claude|codex|gemini)', 'claude')
  .action(async (sessionId, options) => {
    const agent = normalizeAgentOption(options.agent);
    const session = new DoomCodeSession({
      wsUrl: options.wsUrl,
      httpUrl: options.httpUrl,
      workingDirectory: process.cwd(),
      agent,
      sessionId,
      sessionCachePath: getSessionCachePath(process.cwd()),
    });

    try {
      await session.connect();
    } catch (error) {
      console.error('Failed to connect:', error);
      process.exit(1);
    }
  });

program.parse();
