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

export const PREDEFINED_INTENTS: PredefinedIntent[] = [
  {
    id: 'fix-tests',
    label: 'Fix failing tests',
    description: 'Find and fix failing test cases',
    prompt: 'Fix the failing tests and make sure all tests pass',
    icon: '🔧',
    action: 'fix',
  },
  {
    id: 'refactor-auth',
    label: 'Refactor auth',
    description: 'Clean up authentication code',
    prompt: 'Refactor the authentication module for better maintainability',
    icon: '🔐',
    action: 'refactor',
  },
  {
    id: 'explain-file',
    label: 'Explain this file',
    description: 'Get an overview of the current file',
    prompt: 'Explain what this file does and how it works',
    icon: '📖',
    action: 'explain',
  },
  {
    id: 'explain-repo',
    label: 'Explain this repo',
    description: 'Get an overview of the codebase',
    prompt: 'Give me an overview of this repository, its structure, and main components',
    icon: '🗂️',
    action: 'explain',
  },
  {
    id: 'generate-pr',
    label: 'Generate PR description',
    description: 'Create a pull request description',
    prompt: 'Generate a comprehensive pull request description for the current changes',
    icon: '📝',
    action: 'generate',
  },
  {
    id: 'review-changes',
    label: 'Review my changes',
    description: 'Get feedback on recent changes',
    prompt: 'Review my recent code changes and suggest improvements',
    icon: '👀',
    action: 'review',
  },
  {
    id: 'add-tests',
    label: 'Add tests',
    description: 'Generate test cases for the code',
    prompt: 'Generate comprehensive tests for the current code',
    icon: '🧪',
    action: 'generate',
  },
  {
    id: 'fix-lint',
    label: 'Fix lint errors',
    description: 'Fix linting and formatting issues',
    prompt: 'Fix all linting and formatting errors in the codebase',
    icon: '✨',
    action: 'fix',
  },
];

export function getSuggestedIntents(input: string): PredefinedIntent[] {
  if (!input.trim()) {
    return PREDEFINED_INTENTS.slice(0, 4);
  }

  const lowerInput = input.toLowerCase();
  return PREDEFINED_INTENTS.filter(
    (intent) =>
      intent.label.toLowerCase().includes(lowerInput) ||
      intent.description.toLowerCase().includes(lowerInput) ||
      intent.action.includes(lowerInput)
  ).slice(0, 4);
}
