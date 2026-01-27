import { create } from 'zustand';
import type {
  QRCodePayload,
  Message,
  TerminalOutputMessage,
  PermissionRequestMessage,
  DiffPatchMessage,
  PermissionDecision,
  PatchDecision,
  MessageEnvelope,
  AgentId,
  AgentConfig,
  AgentControlMessage,
} from '@doomcode/protocol';
import { createEnvelope } from '@doomcode/protocol';
import { generateKeyPair, E2ECrypto, type KeyPair } from '@doomcode/crypto';
import { useAgentStore } from './agentStore';
import { usePatchHistoryStore } from './patchHistoryStore';

type AgentStatus = 'idle' | 'running' | 'waiting_input' | 'error';

interface SessionState {
  // Connection
  connected: boolean;
  sessionId: string | null;
  relayUrl: string | null;
  keyPair: KeyPair | null;
  crypto: E2ECrypto | null;
  ws: WebSocket | null;

  // Session data
  terminalOutput: TerminalOutputMessage[];
  pendingPermissions: PermissionRequestMessage[];
  pendingDiffs: DiffPatchMessage[];
  agentStatus: AgentStatus;

  // Actions
  connect: (payload: QRCodePayload) => Promise<void>;
  disconnect: () => void;
  sendPrompt: (prompt: string) => void;
  respondToPermission: (requestId: string, decision: PermissionDecision) => void;
  respondToDiff: (patchId: string, decision: PatchDecision) => void;
  sendAgentControl: (
    command: AgentControlMessage['command'],
    config?: Partial<AgentConfig>
  ) => void;
  sendUndoRequest: (patchId: string) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  connected: false,
  sessionId: null,
  relayUrl: null,
  keyPair: null,
  crypto: null,
  ws: null,
  terminalOutput: [],
  pendingPermissions: [],
  pendingDiffs: [],
  agentStatus: 'idle',

  connect: async (payload: QRCodePayload) => {
    const keyPair = generateKeyPair();

    // Connect to base URL - AWS API Gateway doesn't support path-based routing
    const ws = new WebSocket(payload.relayUrl);

    return new Promise((resolve, reject) => {
      let settled = false;

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        try {
          ws.close();
        } catch {
          // ignore
        }
        set({ connected: false, ws: null, crypto: null, keyPair: null, sessionId: null, relayUrl: null });
        reject(err);
      };

      const succeed = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      ws.onopen = () => {
        // Join the session
        ws.send(
          JSON.stringify({
            action: 'join',
            sessionId: payload.sessionId,
            clientType: 'mobile',
            publicKey: keyPair.publicKey,
          })
        );

        // Don't mark connected until relay confirms we actually joined.
        set({
          connected: false,
          sessionId: payload.sessionId,
          relayUrl: payload.relayUrl,
          keyPair,
          ws,
        });
      };

      ws.onerror = () => {
        fail(new Error('WebSocket connection failed'));
      };

      ws.onmessage = (event) => {
        const state = get();
        try {
          const data = JSON.parse(event.data as string);

          // Handle relay control messages
          if ('action' in data) {
            if (data.action === 'session_joined') {
              const peerPublicKey: string | undefined = data.peerPublicKey;
              const crypto = new E2ECrypto(keyPair.secretKey, peerPublicKey ?? payload.publicKey);

              set({
                connected: true,
                sessionId: payload.sessionId,
                relayUrl: payload.relayUrl,
                keyPair,
                crypto,
                ws,
              });

              succeed();
            } else if (data.action === 'peer_disconnected') {
              set({ agentStatus: 'idle' });
            } else if (data.action === 'error') {
              const message =
                typeof data.message === 'string' ? data.message : 'Failed to join session';
              const code = typeof data.code === 'string' ? data.code : 'RELAY_ERROR';
              fail(new Error(`${code}: ${message}`));
            }
            return;
          }

          // Handle encrypted messages
          if ('encryptedPayload' in data && state.crypto) {
            const envelope = data as MessageEnvelope;
            let decrypted: string;
            try {
              decrypted = state.crypto.decrypt({
              nonce: envelope.nonce,
              ciphertext: envelope.encryptedPayload,
            });
            } catch {
              // This can happen if the relay replays queued messages that were encrypted
              // with an older mobile key (e.g. after reinstall/re-pair). Drop it.
              console.warn('Dropping undecryptable message');
              return;
            }
            const msg = JSON.parse(decrypted) as Message;

            switch (msg.type) {
              case 'terminal_output':
                set((s) => ({
                  terminalOutput: [...s.terminalOutput, msg].slice(-500), // Keep last 500
                }));
                break;

              case 'permission_request':
                set((s) => ({
                  pendingPermissions: [...s.pendingPermissions, msg],
                  agentStatus: 'waiting_input',
                }));
                break;

              case 'diff_patch':
                set((s) => ({
                  pendingDiffs: [...s.pendingDiffs, msg],
                }));
                break;

              case 'heartbeat':
                set({ agentStatus: msg.agentStatus });
                break;

              case 'session_state':
                set({
                  pendingPermissions: msg.pendingPermissions,
                  pendingDiffs: msg.pendingPatches,
                  terminalOutput: msg.terminalHistory,
                  agentStatus: msg.agentStatus,
                });
                break;

              case 'agent_status_update':
                // Update the agent store with status from desktop
                useAgentStore.getState().updateStatus(msg.agentId, msg.status);
                useAgentStore.getState().setPendingCommand(null);
                if (msg.lastPrompt) {
                  useAgentStore.getState().setLastPrompt(msg.lastPrompt);
                }
                set({ agentStatus: msg.status });
                break;

              case 'patch_applied':
                // Record the applied patch for undo functionality
                usePatchHistoryStore.getState().recordPatch(msg.patch);
                break;

              case 'undo_result':
                // Handle undo result from desktop
                usePatchHistoryStore.getState().clearUndoPending();
                usePatchHistoryStore.getState().setLastUndoResult({
                  patchId: msg.patchId,
                  success: msg.success,
                  error: msg.error,
                  revertedFiles: msg.revertedFiles,
                });
                if (msg.success) {
                  usePatchHistoryStore.getState().removePatch(msg.patchId);
                }
                break;
            }
          }
        } catch (error) {
          console.error('Failed to handle message:', error);
        }
      };

      ws.onclose = () => {
        // If we haven't successfully joined yet, treat close as a connection failure
        if (!settled) {
          fail(new Error('WebSocket closed before session was joined'));
          return;
        }
        set({ connected: false, ws: null, crypto: null });
      };
    });
  },

  disconnect: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
    }
    set({
      connected: false,
      sessionId: null,
      relayUrl: null,
      keyPair: null,
      crypto: null,
      ws: null,
      terminalOutput: [],
      pendingPermissions: [],
      pendingDiffs: [],
      agentStatus: 'idle',
    });
  },

  sendPrompt: (prompt: string) => {
    const { ws, crypto, sessionId } = get();
    if (!ws || !crypto || !sessionId) {
      console.warn('sendPrompt skipped: not connected/paired yet');
      return;
    }

    // Echo locally so the user sees what they sent in the terminal feed.
    // (The desktop may not print prompts back to stdout.)
    set((s) => ({
      terminalOutput: [
        ...s.terminalOutput,
        {
          type: 'terminal_output' as const,
          stream: 'stdout' as const,
          data: `\n> ${prompt}\n`,
          sequence: Date.now(),
        },
      ].slice(-500),
    }));

    const msg: Message = {
      type: 'user_prompt',
      prompt,
    };

    const encrypted = crypto.encrypt(JSON.stringify(msg));
    const envelope = createEnvelope({
      sessionId,
      sender: 'mobile',
      nonce: encrypted.nonce,
      encryptedPayload: encrypted.ciphertext,
    });

    ws.send(JSON.stringify(envelope));
  },

  respondToPermission: (requestId: string, decision: PermissionDecision) => {
    const { ws, crypto, sessionId } = get();
    if (!ws || !crypto || !sessionId) return;

    const msg: Message = {
      type: 'permission_response',
      requestId,
      decision,
    };

    const encrypted = crypto.encrypt(JSON.stringify(msg));
    const envelope = createEnvelope({
      sessionId,
      sender: 'mobile',
      nonce: encrypted.nonce,
      encryptedPayload: encrypted.ciphertext,
    });

    ws.send(JSON.stringify(envelope));

    // Remove from pending
    set((s) => ({
      pendingPermissions: s.pendingPermissions.filter((p) => p.requestId !== requestId),
      agentStatus: s.pendingPermissions.length <= 1 ? 'running' : 'waiting_input',
    }));
  },

  respondToDiff: (patchId: string, decision: PatchDecision) => {
    const { ws, crypto, sessionId } = get();
    if (!ws || !crypto || !sessionId) return;

    const msg: Message = {
      type: 'patch_decision',
      patchId,
      decision,
    };

    const encrypted = crypto.encrypt(JSON.stringify(msg));
    const envelope = createEnvelope({
      sessionId,
      sender: 'mobile',
      nonce: encrypted.nonce,
      encryptedPayload: encrypted.ciphertext,
    });

    ws.send(JSON.stringify(envelope));

    // Remove from pending
    set((s) => ({
      pendingDiffs: s.pendingDiffs.filter((d) => d.patchId !== patchId),
    }));
  },

  sendAgentControl: (
    command: AgentControlMessage['command'],
    config?: Partial<AgentConfig>
  ) => {
    const { ws, crypto, sessionId } = get();
    if (!ws || !crypto || !sessionId) {
      console.warn('sendAgentControl skipped: not connected/paired yet');
      return;
    }

    const agentStore = useAgentStore.getState();
    const agentId = agentStore.activeAgentId;

    // Mark command as pending
    agentStore.setPendingCommand(command);

    const msg: Message = {
      type: 'agent_control',
      command,
      agentId,
      config,
    };

    const encrypted = crypto.encrypt(JSON.stringify(msg));
    const envelope = createEnvelope({
      sessionId,
      sender: 'mobile',
      nonce: encrypted.nonce,
      encryptedPayload: encrypted.ciphertext,
    });

    ws.send(JSON.stringify(envelope));
  },

  sendUndoRequest: (patchId: string) => {
    const { ws, crypto, sessionId } = get();
    if (!ws || !crypto || !sessionId) {
      console.warn('sendUndoRequest skipped: not connected/paired yet');
      return;
    }

    const patchStore = usePatchHistoryStore.getState();
    if (!patchStore.canUndo()) {
      console.warn('sendUndoRequest skipped: cannot undo right now');
      return;
    }

    // Mark undo as pending
    patchStore.markUndoPending(patchId);

    const msg: Message = {
      type: 'undo_request',
      patchId,
    };

    const encrypted = crypto.encrypt(JSON.stringify(msg));
    const envelope = createEnvelope({
      sessionId,
      sender: 'mobile',
      nonce: encrypted.nonce,
      encryptedPayload: encrypted.ciphertext,
    });

    ws.send(JSON.stringify(envelope));
  },
}));
