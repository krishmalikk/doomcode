import { z } from 'zod';

/**
 * Zod schemas for message validation.
 */

export const MessageTypeSchema = z.enum([
  'terminal_output',
  'permission_request',
  'permission_response',
  'diff_patch',
  'patch_decision',
  'user_prompt',
  'session_state',
  'heartbeat',
  'error',
  'agent_control',
  'agent_status_update',
  'undo_request',
  'undo_result',
  'patch_applied',
]);

export const PermissionActionSchema = z.enum([
  'file_read',
  'file_write',
  'file_delete',
  'shell_command',
  'network',
  'git',
  'other',
]);

export const PermissionDecisionSchema = z.enum([
  'approve',
  'deny',
  'approve_always',
  'deny_always',
]);

export const FileStatusSchema = z.enum(['added', 'modified', 'deleted', 'renamed']);

export const RiskLevelSchema = z.enum(['low', 'medium', 'high']);

export const PatchDecisionSchema = z.enum(['apply', 'reject', 'edit']);

export const AgentStatusSchema = z.enum(['idle', 'running', 'waiting_input', 'error']);

// Base message
const BaseMessageSchema = z.object({
  type: MessageTypeSchema,
  correlationId: z.string().optional(),
});

// Terminal output
export const TerminalOutputMessageSchema = BaseMessageSchema.extend({
  type: z.literal('terminal_output'),
  stream: z.enum(['stdout', 'stderr']),
  data: z.string(),
  sequence: z.number().int().nonnegative(),
});

// Permission request
export const PermissionRequestMessageSchema = BaseMessageSchema.extend({
  type: z.literal('permission_request'),
  requestId: z.string(),
  action: PermissionActionSchema,
  description: z.string(),
  details: z.object({
    path: z.string().optional(),
    command: z.string().optional(),
    url: z.string().optional(),
    files: z.array(z.string()).optional(),
  }),
  timeout: z.number().optional(),
});

// Permission response
export const PermissionResponseMessageSchema = BaseMessageSchema.extend({
  type: z.literal('permission_response'),
  requestId: z.string(),
  decision: PermissionDecisionSchema,
});

// File diff
export const FileDiffSchema = z.object({
  path: z.string(),
  diff: z.string(),
  status: FileStatusSchema,
  oldPath: z.string().optional(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
});

// Diff patch
export const DiffPatchMessageSchema = BaseMessageSchema.extend({
  type: z.literal('diff_patch'),
  patchId: z.string(),
  files: z.array(FileDiffSchema),
  summary: z.string(),
  estimatedRisk: RiskLevelSchema,
  totalAdditions: z.number().int().nonnegative(),
  totalDeletions: z.number().int().nonnegative(),
});

// Patch decision
export const PatchDecisionMessageSchema = BaseMessageSchema.extend({
  type: z.literal('patch_decision'),
  patchId: z.string(),
  decision: PatchDecisionSchema,
  editedDiff: z.string().optional(),
});

// User prompt
export const UserPromptMessageSchema = BaseMessageSchema.extend({
  type: z.literal('user_prompt'),
  prompt: z.string(),
  context: z
    .object({
      selectedFile: z.string().optional(),
      selectedLines: z.tuple([z.number(), z.number()]).optional(),
    })
    .optional(),
});

// Heartbeat
export const HeartbeatMessageSchema = BaseMessageSchema.extend({
  type: z.literal('heartbeat'),
  timestamp: z.number(),
  agentStatus: AgentStatusSchema,
});

// Error
export const ErrorMessageSchema = BaseMessageSchema.extend({
  type: z.literal('error'),
  code: z.string(),
  message: z.string(),
  recoverable: z.boolean(),
});

// ============================================================================
// Agent Control & Status
// ============================================================================

export const AgentIdSchema = z.enum(['claude', 'codex', 'gemini']);

export const AgentControlCommandSchema = z.enum(['start', 'stop', 'retry', 'configure']);

export const ToolPermissionsSchema = z.object({
  allowFileRead: z.boolean(),
  allowFileWrite: z.boolean(),
  allowShellCommands: z.boolean(),
  allowNetworkAccess: z.boolean(),
  allowGitOperations: z.boolean(),
  requireApprovalForWrites: z.boolean(),
});

export const AgentConfigSchema = z.object({
  id: AgentIdSchema,
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  toolPermissions: ToolPermissionsSchema,
});

export const AgentControlMessageSchema = BaseMessageSchema.extend({
  type: z.literal('agent_control'),
  command: AgentControlCommandSchema,
  agentId: AgentIdSchema,
  config: AgentConfigSchema.partial().optional(),
});

export const AgentStatusUpdateMessageSchema = BaseMessageSchema.extend({
  type: z.literal('agent_status_update'),
  agentId: AgentIdSchema,
  status: AgentStatusSchema,
  currentTask: z.string().optional(),
  lastPrompt: z.string().optional(),
});

// ============================================================================
// Patch Tracking for Undo
// ============================================================================

export const PatchedFileSchema = z.object({
  path: z.string(),
  beforeHash: z.string(),
  afterHash: z.string(),
  reverseDiff: z.string(),
});

export const AppliedPatchSchema = z.object({
  patchId: z.string(),
  timestamp: z.number(),
  files: z.array(PatchedFileSchema),
  agentId: AgentIdSchema,
  prompt: z.string(),
});

export const UndoRequestMessageSchema = BaseMessageSchema.extend({
  type: z.literal('undo_request'),
  patchId: z.string(),
});

export const UndoResultMessageSchema = BaseMessageSchema.extend({
  type: z.literal('undo_result'),
  patchId: z.string(),
  success: z.boolean(),
  error: z.string().optional(),
  revertedFiles: z.array(z.string()),
});

export const PatchAppliedMessageSchema = BaseMessageSchema.extend({
  type: z.literal('patch_applied'),
  patch: AppliedPatchSchema,
});

// Union
export const MessageSchema = z.discriminatedUnion('type', [
  TerminalOutputMessageSchema,
  PermissionRequestMessageSchema,
  PermissionResponseMessageSchema,
  DiffPatchMessageSchema,
  PatchDecisionMessageSchema,
  UserPromptMessageSchema,
  HeartbeatMessageSchema,
  ErrorMessageSchema,
  AgentControlMessageSchema,
  AgentStatusUpdateMessageSchema,
  UndoRequestMessageSchema,
  UndoResultMessageSchema,
  PatchAppliedMessageSchema,
]);

// Envelope
export const MessageEnvelopeSchema = z.object({
  version: z.literal(1),
  sessionId: z.string().uuid(),
  messageId: z.string().uuid(),
  timestamp: z.number(),
  sender: z.enum(['desktop', 'mobile']),
  nonce: z.string(),
  encryptedPayload: z.string(),
});
