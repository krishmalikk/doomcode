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
  icon: string;
  action: IntentAction;
}

export const INTENTS_BY_AGENT: Record<AgentId, PredefinedIntent[]> = {
  claude: [
    {
      id: 'claude-fix-tests',
      label: 'Fix failing tests',
      description: 'Find and fix failing test cases',
      prompt: 'Fix the failing tests and make sure all tests pass',
      icon: '🔧',
      action: 'fix',
    },
    {
      id: 'claude-refactor-auth',
      label: 'Refactor auth',
      description: 'Clean up authentication code',
      prompt: 'Refactor the authentication module for better maintainability',
      icon: '🔐',
      action: 'refactor',
    },
    {
      id: 'claude-explain-file',
      label: 'Explain this file',
      description: 'Get an overview of the current file',
      prompt: 'Explain what this file does and how it works',
      icon: '📖',
      action: 'explain',
    },
    {
      id: 'claude-explain-repo',
      label: 'Explain this repo',
      description: 'Get an overview of the codebase',
      prompt: 'Give me an overview of this repository, its structure, and main components',
      icon: '🗂️',
      action: 'explain',
    },
    {
      id: 'claude-generate-pr',
      label: 'Generate PR description',
      description: 'Create a pull request description',
      prompt: 'Generate a comprehensive pull request description for the current changes',
      icon: '📝',
      action: 'generate',
    },
    {
      id: 'claude-review-changes',
      label: 'Review my changes',
      description: 'Get feedback on recent changes',
      prompt: 'Review my recent code changes and suggest improvements',
      icon: '👀',
      action: 'review',
    },
    {
      id: 'claude-add-tests',
      label: 'Add tests',
      description: 'Generate test cases for the code',
      prompt: 'Generate comprehensive tests for the current code',
      icon: '🧪',
      action: 'generate',
    },
    {
      id: 'claude-fix-lint',
      label: 'Fix lint errors',
      description: 'Fix linting and formatting issues',
      prompt: 'Fix all linting and formatting errors in the codebase',
      icon: '✨',
      action: 'fix',
    },
  ],
  codex: [
    {
      id: 'codex-implement-feature',
      label: 'Implement feature',
      description: 'Ship a new feature end-to-end',
      prompt: 'Implement the feature end-to-end, including any necessary updates',
      icon: '🚀',
      action: 'generate',
    },
    {
      id: 'codex-add-tests',
      label: 'Add tests',
      description: 'Write or extend automated tests',
      prompt: 'Add or update tests to cover the recent changes',
      icon: '🧪',
      action: 'generate',
    },
    {
      id: 'codex-fix-bug',
      label: 'Fix a bug',
      description: 'Find the root cause and patch it',
      prompt: 'Find the root cause of the issue and fix it',
      icon: '🧰',
      action: 'fix',
    },
    {
      id: 'codex-refactor',
      label: 'Refactor module',
      description: 'Improve structure and readability',
      prompt: 'Refactor the module for clarity and maintainability',
      icon: '🧱',
      action: 'refactor',
    },
    {
      id: 'codex-review-changes',
      label: 'Review my changes',
      description: 'Spot issues or improvements',
      prompt: 'Review my recent code changes and suggest improvements',
      icon: '👀',
      action: 'review',
    },
    {
      id: 'codex-explain-file',
      label: 'Explain this file',
      description: 'Get a quick overview of the file',
      prompt: 'Explain what this file does and how it works',
      icon: '📖',
      action: 'explain',
    },
    {
      id: 'codex-fix-lint',
      label: 'Fix lint errors',
      description: 'Resolve linting and formatting issues',
      prompt: 'Fix all linting and formatting errors in the codebase',
      icon: '✨',
      action: 'fix',
    },
  ],
  gemini: [
    {
      id: 'gemini-summarize',
      label: 'Summarize changes',
      description: 'Summarize the latest edits',
      prompt: 'Summarize the recent code changes and their impact',
      icon: '🧾',
      action: 'review',
    },
    {
      id: 'gemini-explain-file',
      label: 'Explain this file',
      description: 'Get a high-level walkthrough',
      prompt: 'Explain what this file does and how it works',
      icon: '📖',
      action: 'explain',
    },
    {
      id: 'gemini-find-bugs',
      label: 'Find potential bugs',
      description: 'Spot likely issues or edge cases',
      prompt: 'Find potential bugs and edge cases in this code',
      icon: '🐛',
      action: 'review',
    },
    {
      id: 'gemini-add-docs',
      label: 'Add documentation',
      description: 'Improve docs and comments',
      prompt: 'Add or improve documentation for the current code',
      icon: '📝',
      action: 'generate',
    },
    {
      id: 'gemini-refactor',
      label: 'Refactor for clarity',
      description: 'Simplify and clean up logic',
      prompt: 'Refactor the code for clarity and maintainability',
      icon: '🧹',
      action: 'refactor',
    },
    {
      id: 'gemini-fix-tests',
      label: 'Fix failing tests',
      description: 'Make tests pass again',
      prompt: 'Fix the failing tests and make sure all tests pass',
      icon: '🧪',
      action: 'fix',
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
