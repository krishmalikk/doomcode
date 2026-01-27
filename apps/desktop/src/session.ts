/**
 * DoomCode Session Manager
 *
 * Manages the connection between desktop CLI and mobile app.
 */

import { generateKeyPair, E2ECrypto, type KeyPair } from '@doomcode/crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  createEnvelope,
  type MessageEnvelope,
  type Message,
  type TerminalOutputMessage,
  type PermissionRequestMessage,
  type DiffPatchMessage,
  type RelayClientMessage,
  type RelayServerMessage,
  type QRCodePayload,
  type AgentControlMessage,
  type AgentStatusUpdateMessage,
  type UndoRequestMessage,
  type UndoResultMessage,
  type PatchAppliedMessage,
  type AgentId,
  encodeQRPayload,
} from '@doomcode/protocol';
import WebSocket from 'ws';
import qrcode from 'qrcode-terminal';
import { AgentManager } from './agent/agent-manager.js';
import { PatchTracker } from './agent/patch-tracker.js';

export interface SessionOptions {
  /** WebSocket URL for the relay (e.g., wss://xxx.execute-api.region.amazonaws.com/prod) */
  wsUrl: string;
  /** HTTP API URL for session management (e.g., https://xxx.execute-api.region.amazonaws.com/prod) */
  httpUrl: string;
  workingDirectory: string;
  agent: AgentId;
  sessionId?: string;
  sessionCachePath?: string;
  keyPair?: KeyPair;
}

export class DoomCodeSession {
  private options: SessionOptions;
  private keyPair: KeyPair;
  private ws: WebSocket | null = null;
  private crypto: E2ECrypto | null = null;
  private sessionId: string | null = null;
  private agentManager: AgentManager | null = null;
  private patchTracker: PatchTracker;
  private messageSequence = 0;
  private sessionCachePath: string | null = null;
  private debugSession = process.env.DOOMCODE_DEBUG_SESSION === '1';
  private lastPrompt: string | null = null;
  private pendingPatchId: string | null = null;

  private logDebug(message: string): void {
    if (this.debugSession) {
      console.log(message);
    }
  }

  constructor(options: SessionOptions) {
    this.options = options;
    this.keyPair = options.keyPair ?? generateKeyPair();
    this.sessionId = options.sessionId ?? null;
    this.sessionCachePath = options.sessionCachePath ?? null;
    this.patchTracker = new PatchTracker(options.workingDirectory);
  }

  async start(): Promise<void> {
    console.log('Starting DoomCode session...');
    console.log(`Working directory: ${this.options.workingDirectory}`);
    console.log(`Agent: ${this.options.agent}`);

    // Create session via HTTP API
    const response = await fetch(`${this.options.httpUrl}/session`, { method: 'POST' });
    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }
    const { sessionId } = (await response.json()) as { sessionId: string };
    this.sessionId = sessionId;

    console.log(`Session ID: ${sessionId}`);
    this.persistSessionCache();

    // Connect to relay WebSocket
    await this.connectToRelay();

    // Display QR code for mobile pairing
    this.displayQRCode();

    // Wait for mobile to connect
    console.log('\nWaiting for mobile device to connect...');
  }

  async connect(): Promise<void> {
    if (!this.sessionId) {
      throw new Error('Session ID required for connect');
    }

    console.log(`Connecting to session ${this.sessionId}...`);
    await this.connectToRelay();
    this.persistSessionCache();
  }

  private persistSessionCache(): void {
    if (!this.sessionCachePath || !this.sessionId) return;

    const payload = {
      sessionId: this.sessionId,
      wsUrl: this.options.wsUrl,
      httpUrl: this.options.httpUrl,
      keyPair: {
        publicKey: this.keyPair.publicKey,
        secretKey: this.keyPair.secretKey,
      },
      updatedAt: Date.now(),
    };

    try {
      fs.mkdirSync(path.dirname(this.sessionCachePath), { recursive: true });
      fs.writeFileSync(this.sessionCachePath, JSON.stringify(payload, null, 2), 'utf8');
    } catch (error) {
      console.warn('Failed to write session cache:', error);
    }
  }

  private async connectToRelay(): Promise<void> {
    // API Gateway WebSocket - all connections go to the same URL
    this.ws = new WebSocket(this.options.wsUrl);

    return new Promise((resolve, reject) => {
      if (!this.ws) return reject(new Error('WebSocket not initialized'));

      this.ws.on('open', () => {
        console.log('Connected to relay server');

        // Join the session (API Gateway handles routing via messages, not URL path)
        const joinMsg: RelayClientMessage = {
          action: 'join',
          sessionId: this.sessionId!,
          clientType: 'desktop',
          publicKey: this.keyPair.publicKey,
        };
        this.ws!.send(JSON.stringify(joinMsg));
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('close', () => {
        console.log('Disconnected from relay server');
        // TODO: Implement reconnection logic
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });
    });
  }

  private displayQRCode(): void {
    if (!this.sessionId) return;

    const payload: QRCodePayload = {
      sessionId: this.sessionId,
      publicKey: this.keyPair.publicKey,
      relayUrl: this.options.wsUrl,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    };

    const encoded = encodeQRPayload(payload);

    console.log('\n┌──────────────────────────────────────┐');
    console.log('│  Scan this QR code with your phone:  │');
    console.log('└──────────────────────────────────────┘');
    qrcode.generate(encoded, { small: true });
    console.log('');

    // Fallback for terminals that can't render the QR reliably:
    // Users can copy this payload into any QR generator and scan that instead.
    console.log('QR payload (copy into a QR generator if you cannot see the QR above):');
    console.log(encoded);
    console.log('');
  }

  private handleMessage(data: string): void {
    try {
      const parsed = JSON.parse(data);

      // Check if it's a relay control message or encrypted envelope
      if ('action' in parsed) {
        this.handleRelayMessage(parsed as RelayServerMessage);
      } else if ('encryptedPayload' in parsed) {
        this.handleEncryptedMessage(parsed as MessageEnvelope);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private handleRelayMessage(msg: RelayServerMessage): void {
    switch (msg.action) {
      case 'session_created':
        console.log('Session created');
        break;

      case 'session_joined':
        console.log('Joined session');
        if (msg.peerPublicKey) {
          this.onPeerConnected(msg.peerPublicKey);
        }
        break;

      case 'peer_connected':
        console.log(`Mobile device connected`);
        this.onPeerConnected(msg.peerPublicKey);
        break;

      case 'peer_disconnected':
        console.log('Mobile device disconnected');
        break;

      case 'error':
        console.error(`Relay error: ${msg.code} - ${msg.message}`);
        break;
    }
  }

  private onPeerConnected(publicKey: string): void {
    this.crypto = new E2ECrypto(this.keyPair.secretKey, publicKey);

    console.log('\n✓ Mobile device paired successfully!');
    console.log('Starting agent...\n');

    // Start the agent
    this.startAgent();
  }

  private async startAgent(): Promise<void> {
    this.agentManager = new AgentManager({
      agent: this.options.agent,
      workingDirectory: this.options.workingDirectory,
      onOutput: (stream, data) => this.handleAgentOutput(stream, data),
      onPermissionRequest: (request) => this.handlePermissionRequest(request),
      onDiff: (diff) => this.handleDiff(diff),
      onExit: (code) => this.handleAgentExit(code),
    });

    await this.agentManager.start();
  }

  private handleAgentOutput(stream: 'stdout' | 'stderr', data: string): void {
    // Send to mobile
    const msg: TerminalOutputMessage = {
      type: 'terminal_output',
      stream,
      data,
      sequence: this.messageSequence++,
    };

    this.sendEncrypted(msg);

    // Also print locally
    if (stream === 'stdout') {
      process.stdout.write(data);
    } else {
      process.stderr.write(data);
    }
  }

  private handlePermissionRequest(request: PermissionRequestMessage): void {
    console.log(`\n[Permission required: ${request.description}]`);
    this.sendEncrypted(request);
  }

  private async handleDiff(diff: DiffPatchMessage): Promise<void> {
    console.log(`\n[Diff ready for review: ${diff.files.length} files]`);

    // Prepare patch tracking before sending to mobile
    const patchId = await this.patchTracker.prepareForPatch(
      diff,
      this.lastPrompt ?? '',
      this.options.agent
    );

    // Update the diff with the tracking patch ID
    const trackedDiff: DiffPatchMessage = {
      ...diff,
      patchId,
    };

    this.pendingPatchId = patchId;
    this.sendEncrypted(trackedDiff);
  }

  private handleAgentExit(code: number): void {
    console.log(`\nAgent exited with code ${code}`);
  }

  private handleEncryptedMessage(envelope: MessageEnvelope): void {
    if (!this.crypto) {
      console.error('Cannot decrypt: no crypto context');
      return;
    }

    try {
      const decrypted = this.crypto.decrypt({
        nonce: envelope.nonce,
        ciphertext: envelope.encryptedPayload,
      });

      const msg = JSON.parse(decrypted) as Message;
      this.handleDecryptedMessage(msg);
    } catch (error) {
      console.error('Failed to decrypt message:', error);
    }
  }

  private handleDecryptedMessage(msg: Message): void {
    this.logDebug(`\n>>> [DESKTOP] Received decrypted message type: ${msg.type}`);

    switch (msg.type) {
      case 'permission_response':
        console.log(`Permission ${msg.decision} for ${msg.requestId}`);
        this.agentManager?.handlePermissionResponse(msg);
        break;

      case 'patch_decision':
        console.log(`Patch ${msg.decision} for ${msg.patchId}`);
        this.handlePatchDecision(msg);
        break;

      case 'user_prompt':
        this.logDebug(`>>> [DESKTOP] USER PROMPT RECEIVED: "${msg.prompt}"`);
        this.logDebug('>>> [DESKTOP] Calling agentManager.sendPrompt()...');
        this.lastPrompt = msg.prompt;
        this.agentManager?.sendPrompt(msg.prompt);
        this.logDebug('>>> [DESKTOP] sendPrompt() returned');
        break;

      case 'heartbeat':
        // Respond with heartbeat
        this.sendEncrypted({
          type: 'heartbeat',
          timestamp: Date.now(),
          agentStatus: this.agentManager?.getStatus() ?? 'idle',
        });
        break;

      case 'agent_control':
        this.handleAgentControl(msg as AgentControlMessage);
        break;

      case 'undo_request':
        this.handleUndoRequest(msg as UndoRequestMessage);
        break;
    }
  }

  private handleAgentControl(msg: AgentControlMessage): void {
    this.logDebug(`>>> [DESKTOP] Agent control: ${msg.command} for ${msg.agentId}`);

    switch (msg.command) {
      case 'start':
        if (msg.agentId !== this.options.agent) {
          this.agentManager?.stop();
          this.agentManager = null;
          this.options.agent = msg.agentId;
        }
        if (!this.agentManager || this.agentManager.getStatus() === 'idle') {
          this.startAgent();
        }
        this.sendAgentStatusUpdate();
        break;

      case 'stop':
        this.agentManager?.stop();
        this.sendAgentStatusUpdate();
        break;

      case 'retry':
        if (msg.agentId !== this.options.agent) {
          this.agentManager?.stop();
          this.agentManager = null;
          this.options.agent = msg.agentId;
        }
        if (this.lastPrompt && this.agentManager?.getStatus() === 'idle') {
          this.agentManager?.sendPrompt(this.lastPrompt);
        }
        this.sendAgentStatusUpdate();
        break;

      case 'configure':
        // Handle configuration updates (model, temperature, permissions)
        // For now, log and acknowledge - full implementation requires agent restart
        console.log('Agent configuration update:', msg.config);
        this.sendAgentStatusUpdate();
        break;
    }
  }

  private sendAgentStatusUpdate(): void {
    const statusUpdate: AgentStatusUpdateMessage = {
      type: 'agent_status_update',
      agentId: this.options.agent,
      status: this.agentManager?.getStatus() ?? 'idle',
      lastPrompt: this.lastPrompt ?? undefined,
    };
    this.sendEncrypted(statusUpdate);
  }

  private async handleUndoRequest(msg: UndoRequestMessage): Promise<void> {
    this.logDebug(`>>> [DESKTOP] Undo request for patch: ${msg.patchId}`);

    const result = await this.patchTracker.undoPatch(msg.patchId);

    const undoResult: UndoResultMessage = {
      type: 'undo_result',
      patchId: msg.patchId,
      success: result.success,
      error: result.error,
      revertedFiles: result.revertedFiles,
    };

    this.sendEncrypted(undoResult);

    if (result.success) {
      console.log(`Undo successful: reverted ${result.revertedFiles.length} files`);
    } else {
      console.log(`Undo failed: ${result.error}`);
    }
  }

  private async handlePatchDecision(msg: { type: 'patch_decision'; patchId: string; decision: string; editedDiff?: string }): Promise<void> {
    if (msg.decision === 'apply' && this.pendingPatchId === msg.patchId) {
      // Finalize the patch and send applied notification
      const appliedPatch = await this.patchTracker.finalizePatch(msg.patchId);
      if (appliedPatch) {
        const patchApplied: PatchAppliedMessage = {
          type: 'patch_applied',
          patch: appliedPatch,
        };
        this.sendEncrypted(patchApplied);
      }
      this.pendingPatchId = null;
    }

    this.agentManager?.handlePatchDecision(msg as any);
  }

  private sendEncrypted(msg: Message): void {
    if (!this.ws || !this.crypto || !this.sessionId) {
      console.error('Cannot send: not connected');
      return;
    }

    const encrypted = this.crypto.encrypt(JSON.stringify(msg));
    const envelope = createEnvelope({
      sessionId: this.sessionId,
      sender: 'desktop',
      nonce: encrypted.nonce,
      encryptedPayload: encrypted.ciphertext,
    });

    this.ws.send(JSON.stringify(envelope));
  }
}
