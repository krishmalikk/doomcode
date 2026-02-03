/**
 * Message types for DoomCode protocol.
 * These are the decrypted payload types that flow between desktop and mobile.
 */

export type MessageType =
  | 'terminal_output'
  | 'permission_request'
  | 'permission_response'
  | 'diff_patch'
  | 'patch_decision'
  | 'user_prompt'
  | 'session_state'
  | 'heartbeat'
  | 'error'
  | 'agent_control'
  | 'agent_status_update'
  | 'undo_request'
  | 'undo_result'
  | 'patch_applied'
  | 'github_token_share'
  | 'github_token_revoke'
  | 'pr_create_request'
  | 'pr_create_result';

export interface BaseMessage {
  type: MessageType;
  correlationId?: string;
}

// ============================================================================
// Terminal Output
// ============================================================================

export interface TerminalOutputMessage extends BaseMessage {
  type: 'terminal_output';
  stream: 'stdout' | 'stderr';
  data: string;
  sequence: number;
}

// ============================================================================
// Permission Requests/Responses
// ============================================================================

export type PermissionAction =
  | 'file_read'
  | 'file_write'
  | 'file_delete'
  | 'shell_command'
  | 'network'
  | 'git'
  | 'other';

export interface PermissionRequestMessage extends BaseMessage {
  type: 'permission_request';
  requestId: string;
  action: PermissionAction;
  description: string;
  details: {
    path?: string;
    command?: string;
    url?: string;
    files?: string[];
  };
  timeout?: number;
}

export type PermissionDecision = 'approve' | 'deny' | 'approve_always' | 'deny_always';

export interface PermissionResponseMessage extends BaseMessage {
  type: 'permission_response';
  requestId: string;
  decision: PermissionDecision;
}

// ============================================================================
// Diff/Patch Review
// ============================================================================

export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed';

export interface FileDiff {
  path: string;
  diff: string;
  status: FileStatus;
  oldPath?: string;
  additions: number;
  deletions: number;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface DiffPatchMessage extends BaseMessage {
  type: 'diff_patch';
  patchId: string;
  files: FileDiff[];
  summary: string;
  estimatedRisk: RiskLevel;
  totalAdditions: number;
  totalDeletions: number;
}

export type PatchDecision = 'apply' | 'reject' | 'edit';

export interface PatchDecisionMessage extends BaseMessage {
  type: 'patch_decision';
  patchId: string;
  decision: PatchDecision;
  editedDiff?: string;
}

// ============================================================================
// User Prompts
// ============================================================================

export interface UserPromptMessage extends BaseMessage {
  type: 'user_prompt';
  prompt: string;
  context?: {
    selectedFile?: string;
    selectedLines?: [number, number];
  };
}

// ============================================================================
// Session State
// ============================================================================

export type AgentType = 'claude' | 'codex' | 'gemini' | null;
export type AgentId = 'claude' | 'codex' | 'gemini';

// ============================================================================
// Agent Configuration
// ============================================================================

export interface ToolPermissions {
  allowFileRead: boolean;
  allowFileWrite: boolean;
  allowShellCommands: boolean;
  allowNetworkAccess: boolean;
  allowGitOperations: boolean;
  requireApprovalForWrites: boolean;
}

export interface AgentConfig {
  id: AgentId;
  model?: string;
  temperature?: number;
  toolPermissions: ToolPermissions;
}

// ============================================================================
// Agent Control (Mobile -> Desktop)
// ============================================================================

export type AgentControlCommand = 'start' | 'stop' | 'retry' | 'configure';

export interface AgentControlMessage extends BaseMessage {
  type: 'agent_control';
  command: AgentControlCommand;
  agentId: AgentId;
  config?: Partial<AgentConfig>;
}

// ============================================================================
// Agent Status Update (Desktop -> Mobile)
// ============================================================================

export interface AgentStatusUpdateMessage extends BaseMessage {
  type: 'agent_status_update';
  agentId: AgentId;
  status: 'idle' | 'running' | 'waiting_input' | 'error';
  currentTask?: string;
  lastPrompt?: string;
}

// ============================================================================
// Patch Tracking for Undo
// ============================================================================

export interface PatchedFile {
  path: string;
  beforeHash: string;
  afterHash: string;
  reverseDiff: string;
}

export interface AppliedPatch {
  patchId: string;
  timestamp: number;
  files: PatchedFile[];
  agentId: AgentId;
  prompt: string;
}

export interface UndoRequestMessage extends BaseMessage {
  type: 'undo_request';
  patchId: string;
}

export interface UndoResultMessage extends BaseMessage {
  type: 'undo_result';
  patchId: string;
  success: boolean;
  error?: string;
  revertedFiles: string[];
}

export interface PatchAppliedMessage extends BaseMessage {
  type: 'patch_applied';
  patch: AppliedPatch;
}

export interface SessionStateMessage extends BaseMessage {
  type: 'session_state';
  pendingPermissions: PermissionRequestMessage[];
  pendingPatches: DiffPatchMessage[];
  terminalHistory: TerminalOutputMessage[];
  currentAgent: AgentType;
  workingDirectory: string;
  gitBranch?: string;
  gitStatus?: string;
  agentStatus: 'idle' | 'running' | 'waiting_input' | 'error';
}

// ============================================================================
// Heartbeat
// ============================================================================

export interface HeartbeatMessage extends BaseMessage {
  type: 'heartbeat';
  timestamp: number;
  agentStatus: 'idle' | 'running' | 'waiting_input' | 'error';
}

// ============================================================================
// Error
// ============================================================================

export interface ErrorMessage extends BaseMessage {
  type: 'error';
  code: string;
  message: string;
  recoverable: boolean;
}

// ============================================================================
// GitHub Integration
// ============================================================================

export interface GitHubTokenShareMessage extends BaseMessage {
  type: 'github_token_share';
  accessToken: string;
  tokenType: string;
  scope: string;
  expiresAt?: number;
}

export interface GitHubTokenRevokeMessage extends BaseMessage {
  type: 'github_token_revoke';
}

export type PRCreateErrorCode =
  | 'NO_TOKEN'
  | 'NO_CHANGES'
  | 'PUSH_FAILED'
  | 'PR_CREATE_FAILED'
  | 'BRANCH_EXISTS'
  | 'NOT_GIT_REPO'
  | 'NO_REMOTE';

export interface PRCreateRequestMessage extends BaseMessage {
  type: 'pr_create_request';
  requestId: string;
  branchName: string;
  title: string;
  body: string;
  baseBranch?: string;
  draft?: boolean;
}

export interface PRCreateResultMessage extends BaseMessage {
  type: 'pr_create_result';
  requestId: string;
  success: boolean;
  prUrl?: string;
  prNumber?: number;
  error?: string;
  errorCode?: PRCreateErrorCode;
}

// ============================================================================
// Union Type
// ============================================================================

export type Message =
  | TerminalOutputMessage
  | PermissionRequestMessage
  | PermissionResponseMessage
  | DiffPatchMessage
  | PatchDecisionMessage
  | UserPromptMessage
  | SessionStateMessage
  | HeartbeatMessage
  | ErrorMessage
  | AgentControlMessage
  | AgentStatusUpdateMessage
  | UndoRequestMessage
  | UndoResultMessage
  | PatchAppliedMessage
  | GitHubTokenShareMessage
  | GitHubTokenRevokeMessage
  | PRCreateRequestMessage
  | PRCreateResultMessage;
