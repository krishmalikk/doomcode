import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AgentId,
  AgentConfig,
  ToolPermissions,
  AgentControlMessage,
} from '@doomcode/protocol';

type AgentStatus = 'idle' | 'running' | 'waiting_input' | 'error';

const defaultToolPermissions: ToolPermissions = {
  allowFileRead: true,
  allowFileWrite: true,
  allowShellCommands: true,
  allowNetworkAccess: true,
  allowGitOperations: true,
  requireApprovalForWrites: true,
};

const defaultClaudeConfig: AgentConfig = {
  id: 'claude',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  toolPermissions: defaultToolPermissions,
};

const defaultCodexConfig: AgentConfig = {
  id: 'codex',
  temperature: 0.7,
  toolPermissions: defaultToolPermissions,
};

const defaultGeminiConfig: AgentConfig = {
  id: 'gemini',
  temperature: 0.7,
  toolPermissions: defaultToolPermissions,
};

const getDefaultConfig = (id: AgentId): AgentConfig => {
  switch (id) {
    case 'codex':
      return defaultCodexConfig;
    case 'gemini':
      return defaultGeminiConfig;
    case 'claude':
    default:
      return defaultClaudeConfig;
  }
};

interface AgentState {
  // Current active agent
  activeAgentId: AgentId;

  // Per-agent configuration (persisted)
  configs: Partial<Record<AgentId, AgentConfig>>;

  // Per-agent runtime status (not persisted)
  statuses: Partial<Record<AgentId, AgentStatus>>;

  // Last prompt sent (for retry functionality)
  lastPrompt: string | null;

  // Pending control command (for tracking in-flight commands)
  pendingCommand: AgentControlMessage['command'] | null;

  // Actions
  setActiveAgent: (id: AgentId) => void;
  updateConfig: (id: AgentId, config: Partial<AgentConfig>) => void;
  updateStatus: (id: AgentId, status: AgentStatus) => void;
  setLastPrompt: (prompt: string) => void;
  setPendingCommand: (command: AgentControlMessage['command'] | null) => void;
  getActiveConfig: () => AgentConfig;
  getActiveStatus: () => AgentStatus;
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      activeAgentId: 'claude',
      configs: {
        claude: defaultClaudeConfig,
        codex: defaultCodexConfig,
        gemini: defaultGeminiConfig,
      },
      statuses: {
        claude: 'idle',
      },
      lastPrompt: null,
      pendingCommand: null,

      setActiveAgent: (id) =>
        set({
          activeAgentId: id,
          // Initialize config if not present
          configs: get().configs[id]
            ? get().configs
            : {
                ...get().configs,
                [id]: getDefaultConfig(id),
              },
        }),

      updateConfig: (id, config) =>
        set((state) => ({
          configs: {
            ...state.configs,
            [id]: {
              ...state.configs[id],
              ...config,
              id, // Ensure id is always set
              toolPermissions: {
                ...(state.configs[id]?.toolPermissions ?? defaultToolPermissions),
                ...(config.toolPermissions ?? {}),
              },
            } as AgentConfig,
          },
        })),

      updateStatus: (id, status) =>
        set((state) => ({
          statuses: {
            ...state.statuses,
            [id]: status,
          },
        })),

      setLastPrompt: (prompt) => set({ lastPrompt: prompt }),

      setPendingCommand: (command) => set({ pendingCommand: command }),

      getActiveConfig: () => {
        const state = get();
        return state.configs[state.activeAgentId] ?? getDefaultConfig(state.activeAgentId);
      },

      getActiveStatus: () => {
        const state = get();
        return state.statuses[state.activeAgentId] ?? 'idle';
      },
    }),
    {
      name: 'agent-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist configs, not runtime status
      partialize: (state) => ({
        activeAgentId: state.activeAgentId,
        configs: state.configs,
      }),
    }
  )
);
