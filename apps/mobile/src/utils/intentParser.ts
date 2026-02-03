import type { AgentId } from '@doomcode/protocol';

export type IntentAction = 'fix' | 'refactor' | 'explain' | 'generate' | 'review' | 'custom';

export interface StructuredIntent {
  action: IntentAction;
  target?: string;
  context?: {
    file?: string;
    selection?: [number, number];
  };
  rawPrompt: string;
  formattedPrompt: string;
}

interface IntentPattern {
  action: IntentAction;
  patterns: RegExp[];
  extractTarget: (match: RegExpMatchArray) => string | undefined;
  formatPrompt: (target?: string) => string;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    action: 'fix',
    patterns: [
      /^fix\s+(.*)/i,
      /^fix\s+(?:the\s+)?(?:failing\s+)?tests?$/i,
      /^(?:please\s+)?fix\s+(.*)/i,
      /^debug\s+(.*)/i,
      /^solve\s+(.*)/i,
    ],
    extractTarget: (match) => match[1]?.trim() || 'failing tests',
    formatPrompt: (target) => `Fix ${target || 'the failing tests'}`,
  },
  {
    action: 'refactor',
    patterns: [
      /^refactor\s+(.*)/i,
      /^(?:please\s+)?refactor\s+(.*)/i,
      /^clean\s*up\s+(.*)/i,
      /^improve\s+(.*)/i,
      /^optimize\s+(.*)/i,
    ],
    extractTarget: (match) => match[1]?.trim(),
    formatPrompt: (target) => `Refactor ${target || 'the code'}`,
  },
  {
    action: 'explain',
    patterns: [
      /^explain\s+(.*)/i,
      /^(?:please\s+)?explain\s+(.*)/i,
      /^what\s+(?:is|does)\s+(.*)/i,
      /^how\s+does\s+(.*)\s+work/i,
      /^describe\s+(.*)/i,
    ],
    extractTarget: (match) => match[1]?.trim(),
    formatPrompt: (target) => `Explain ${target || 'this code'}`,
  },
  {
    action: 'generate',
    patterns: [
      /^generate\s+(.*)/i,
      /^(?:please\s+)?generate\s+(.*)/i,
      /^create\s+(.*)/i,
      /^write\s+(.*)/i,
      /^add\s+(.*)/i,
      /^implement\s+(.*)/i,
    ],
    extractTarget: (match) => match[1]?.trim(),
    formatPrompt: (target) => `Generate ${target || 'code'}`,
  },
  {
    action: 'review',
    patterns: [
      /^review\s+(.*)/i,
      /^(?:please\s+)?review\s+(.*)/i,
      /^check\s+(.*)/i,
      /^audit\s+(.*)/i,
    ],
    extractTarget: (match) => match[1]?.trim(),
    formatPrompt: (target) => `Review ${target || 'the code'}`,
  },
];

export function parseIntent(input: string): StructuredIntent {
  const trimmedInput = input.trim();

  for (const intentPattern of INTENT_PATTERNS) {
    for (const pattern of intentPattern.patterns) {
      const match = trimmedInput.match(pattern);
      if (match) {
        const target = intentPattern.extractTarget(match);
        return {
          action: intentPattern.action,
          target,
          rawPrompt: trimmedInput,
          formattedPrompt: intentPattern.formatPrompt(target),
        };
      }
    }
  }

  // Default to custom action
  return {
    action: 'custom',
    rawPrompt: trimmedInput,
    formattedPrompt: trimmedInput,
  };
}

export interface PredefinedIntent {
  id: string;
  label: string;
  description: string;
  prompt: string;
  action: IntentAction;
}

export const INTENTS_BY_AGENT: Record<AgentId, PredefinedIntent[]> = {
  claude: [
    {
      id: 'claude-help',
      label: '/help',
      description: 'Show available commands',
      prompt: '/help',
      action: 'explain',
    },
    {
      id: 'claude-compact',
      label: '/compact',
      description: 'Compress conversation context',
      prompt: '/compact',
      action: 'custom',
    },
    {
      id: 'claude-clear',
      label: '/clear',
      description: 'Clear conversation history',
      prompt: '/clear',
      action: 'custom',
    },
    {
      id: 'claude-context',
      label: '/context',
      description: 'Show context usage',
      prompt: '/context',
      action: 'explain',
    },
    {
      id: 'claude-memory',
      label: '/memory',
      description: 'Edit CLAUDE.md memory files',
      prompt: '/memory',
      action: 'custom',
    },
    {
      id: 'claude-status',
      label: '/status',
      description: 'Show version and connectivity',
      prompt: '/status',
      action: 'explain',
    },
    {
      id: 'claude-config',
      label: '/config',
      description: 'Open configuration',
      prompt: '/config',
      action: 'custom',
    },
    {
      id: 'claude-cost',
      label: '/cost',
      description: 'Show token costs',
      prompt: '/cost',
      action: 'explain',
    },
    {
      id: 'claude-doctor',
      label: '/doctor',
      description: 'Check installation health',
      prompt: '/doctor',
      action: 'fix',
    },
    {
      id: 'claude-review',
      label: '/review',
      description: 'Review code changes',
      prompt: '/review',
      action: 'review',
    },
  ],
  codex: [
    {
      id: 'codex-model',
      label: '/model',
      description: 'Choose active model',
      prompt: '/model',
      action: 'custom',
    },
    {
      id: 'codex-status',
      label: '/status',
      description: 'Show config and token usage',
      prompt: '/status',
      action: 'explain',
    },
    {
      id: 'codex-permissions',
      label: '/permissions',
      description: 'Adjust approval requirements',
      prompt: '/permissions',
      action: 'custom',
    },
    {
      id: 'codex-new',
      label: '/new',
      description: 'Start fresh conversation',
      prompt: '/new',
      action: 'custom',
    },
    {
      id: 'codex-resume',
      label: '/resume',
      description: 'Resume saved conversation',
      prompt: '/resume',
      action: 'custom',
    },
    {
      id: 'codex-fork',
      label: '/fork',
      description: 'Clone conversation to new thread',
      prompt: '/fork',
      action: 'custom',
    },
    {
      id: 'codex-compact',
      label: '/compact',
      description: 'Summarize to free context',
      prompt: '/compact',
      action: 'custom',
    },
    {
      id: 'codex-mention',
      label: '/mention',
      description: 'Attach files to prompt',
      prompt: '/mention',
      action: 'custom',
    },
    {
      id: 'codex-diff',
      label: '/diff',
      description: 'Show Git diff',
      prompt: '/diff',
      action: 'review',
    },
    {
      id: 'codex-review',
      label: '/review',
      description: 'Assess working tree',
      prompt: '/review',
      action: 'review',
    },
    {
      id: 'codex-mcp',
      label: '/mcp',
      description: 'List MCP tools',
      prompt: '/mcp',
      action: 'explain',
    },
    {
      id: 'codex-init',
      label: '/init',
      description: 'Create AGENTS.md scaffold',
      prompt: '/init',
      action: 'generate',
    },
    {
      id: 'codex-quit',
      label: '/quit',
      description: 'Exit session',
      prompt: '/quit',
      action: 'custom',
    },
  ],
  gemini: [
    {
      id: 'gemini-help',
      label: '/help',
      description: 'Display help information',
      prompt: '/help',
      action: 'explain',
    },
    {
      id: 'gemini-clear',
      label: '/clear',
      description: 'Clear terminal screen',
      prompt: '/clear',
      action: 'custom',
    },
    {
      id: 'gemini-compress',
      label: '/compress',
      description: 'Summarize chat context',
      prompt: '/compress',
      action: 'custom',
    },
    {
      id: 'gemini-copy',
      label: '/copy',
      description: 'Copy last output to clipboard',
      prompt: '/copy',
      action: 'custom',
    },
    {
      id: 'gemini-chat',
      label: '/chat',
      description: 'Save/resume conversation',
      prompt: '/chat',
      action: 'custom',
    },
    {
      id: 'gemini-model',
      label: '/model',
      description: 'Choose a model',
      prompt: '/model',
      action: 'custom',
    },
    {
      id: 'gemini-memory',
      label: '/memory',
      description: 'Manage AI memory context',
      prompt: '/memory',
      action: 'custom',
    },
    {
      id: 'gemini-mcp',
      label: '/mcp',
      description: 'List MCP servers and tools',
      prompt: '/mcp',
      action: 'explain',
    },
    {
      id: 'gemini-workspace',
      label: '/workspace',
      description: 'Manage workspace directories',
      prompt: '/workspace',
      action: 'custom',
    },
    {
      id: 'gemini-init',
      label: '/init',
      description: 'Generate GEMINI.md file',
      prompt: '/init',
      action: 'generate',
    },
    {
      id: 'gemini-restore',
      label: '/restore',
      description: 'Undo file changes',
      prompt: '/restore',
      action: 'fix',
    },
    {
      id: 'gemini-quit',
      label: '/quit',
      description: 'Exit Gemini CLI',
      prompt: '/quit',
      action: 'custom',
    },
  ],
};

export function getSuggestedIntents(input: string, agentId: AgentId): PredefinedIntent[] {
  const intents = INTENTS_BY_AGENT[agentId] ?? [];
  if (!input.trim()) {
    return intents.slice(0, 4);
  }

  const lowerInput = input.toLowerCase();
  return intents.filter(
    (intent) =>
      intent.label.toLowerCase().includes(lowerInput) ||
      intent.description.toLowerCase().includes(lowerInput) ||
      intent.action.includes(lowerInput)
  ).slice(0, 4);
}
