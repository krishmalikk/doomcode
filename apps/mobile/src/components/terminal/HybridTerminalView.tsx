import { useRef, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, type ListRenderItem } from 'react-native';
import type { TerminalOutputMessage, DiffPatchMessage, AgentId } from '@doomcode/protocol';
import { AgentTabBar } from './AgentTabBar';
import { PromptBubble } from './PromptBubble';
import { OutputBlock } from './OutputBlock';
import { StatusIndicator } from './StatusIndicator';
import { DiffCard } from './DiffCard';
import { useAgentStore } from '../../store/agentStore';

type MessageType = 'prompt' | 'output' | 'status' | 'diff' | 'code';

interface ParsedMessage {
  id: string;
  type: MessageType;
  content: string;
  agentId?: AgentId;
  timestamp?: number;
  metadata?: {
    language?: string;
    filename?: string;
    patchId?: string;
    status?: 'idle' | 'running' | 'waiting_input' | 'error' | 'thinking';
  };
}

interface Props {
  terminalOutput: TerminalOutputMessage[];
  pendingDiffs?: DiffPatchMessage[];
  agentStatus?: 'idle' | 'running' | 'waiting_input' | 'error';
  lastPrompt?: string;
  onAgentChange?: (agentId: AgentId) => void;
  onDiffApply?: (patchId: string) => void;
  onDiffReject?: (patchId: string) => void;
}

/**
 * Parse raw terminal output into structured messages
 */
function parseTerminalOutput(
  output: TerminalOutputMessage[],
  lastPrompt?: string,
  agentId?: AgentId
): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  let currentOutputBuffer = '';
  let messageIndex = 0;

  // Add the last prompt if available
  if (lastPrompt) {
    messages.push({
      id: `prompt-${messageIndex++}`,
      type: 'prompt',
      content: lastPrompt,
      timestamp: Date.now(),
    });
  }

  // Process terminal output
  for (const msg of output) {
    currentOutputBuffer += msg.data;
  }

  // Split output into logical blocks
  // Look for common patterns like code blocks, diffs, etc.
  if (currentOutputBuffer) {
    const blocks = splitOutputIntoBlocks(currentOutputBuffer);

    for (const block of blocks) {
      messages.push({
        id: `output-${messageIndex++}`,
        type: block.type,
        content: block.content,
        agentId,
        timestamp: Date.now(),
        metadata: block.metadata,
      });
    }
  }

  return messages;
}

interface OutputBlock {
  type: MessageType;
  content: string;
  metadata?: ParsedMessage['metadata'];
}

/**
 * Split raw output into logical blocks (code, text, etc.)
 */
function splitOutputIntoBlocks(output: string): OutputBlock[] {
  const blocks: OutputBlock[] = [];
  const lines = output.split('\n');
  let currentBlock: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect code block start (```language)
    const codeBlockStart = line.match(/^```(\w+)?$/);
    if (codeBlockStart && !inCodeBlock) {
      // Save current text block
      if (currentBlock.length > 0) {
        const content = currentBlock.join('\n').trim();
        if (content) {
          blocks.push({ type: 'output', content });
        }
        currentBlock = [];
      }
      inCodeBlock = true;
      codeLanguage = codeBlockStart[1] || 'text';
      continue;
    }

    // Detect code block end
    if (line === '```' && inCodeBlock) {
      const content = currentBlock.join('\n');
      if (content) {
        blocks.push({
          type: 'code',
          content,
          metadata: { language: codeLanguage },
        });
      }
      currentBlock = [];
      inCodeBlock = false;
      codeLanguage = '';
      continue;
    }

    currentBlock.push(line);
  }

  // Handle remaining content
  if (currentBlock.length > 0) {
    const content = currentBlock.join('\n').trim();
    if (content) {
      blocks.push({
        type: inCodeBlock ? 'code' : 'output',
        content,
        metadata: inCodeBlock ? { language: codeLanguage } : undefined,
      });
    }
  }

  return blocks;
}

export function HybridTerminalView({
  terminalOutput,
  pendingDiffs = [],
  agentStatus = 'idle',
  lastPrompt,
  onAgentChange,
  onDiffApply,
  onDiffReject,
}: Props) {
  const flatListRef = useRef<FlatList>(null);
  const { activeAgentId } = useAgentStore();

  // Parse terminal output into structured messages
  const messages = useMemo(() => {
    const parsed = parseTerminalOutput(terminalOutput, lastPrompt, activeAgentId);

    // Add pending diffs
    for (const diff of pendingDiffs) {
      parsed.push({
        id: `diff-${diff.patchId}`,
        type: 'diff',
        content: diff.files.map(f => f.diff).join('\n'),
        metadata: { patchId: diff.patchId },
      });
    }

    // Add status indicator if agent is active
    if (agentStatus !== 'idle') {
      parsed.push({
        id: 'status-current',
        type: 'status',
        content: '',
        agentId: activeAgentId,
        metadata: { status: agentStatus },
      });
    }

    return parsed;
  }, [terminalOutput, pendingDiffs, agentStatus, lastPrompt, activeAgentId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const renderItem: ListRenderItem<ParsedMessage> = useCallback(
    ({ item }) => {
      switch (item.type) {
        case 'prompt':
          return <PromptBubble prompt={item.content} timestamp={item.timestamp} />;

        case 'output':
          return (
            <OutputBlock
              content={item.content}
              agentId={item.agentId}
              timestamp={item.timestamp}
              collapsible={item.content.split('\n').length > 30}
            />
          );

        case 'status':
          return (
            <StatusIndicator
              status={item.metadata?.status || 'idle'}
              agentId={item.agentId}
            />
          );

        case 'diff':
          return (
            <DiffCard
              diff={item.content}
              patchId={item.metadata?.patchId}
              onApply={
                item.metadata?.patchId && onDiffApply
                  ? () => onDiffApply(item.metadata!.patchId!)
                  : undefined
              }
              onReject={
                item.metadata?.patchId && onDiffReject
                  ? () => onDiffReject(item.metadata!.patchId!)
                  : undefined
              }
            />
          );

        case 'code':
          return (
            <View style={styles.codeBlockWrapper}>
              <OutputBlock
                content={item.content}
                agentId={item.agentId}
              />
            </View>
          );

        default:
          return null;
      }
    },
    [onDiffApply, onDiffReject]
  );

  const keyExtractor = useCallback((item: ParsedMessage) => item.id, []);

  return (
    <View style={styles.container}>
      <AgentTabBar onAgentChange={onAgentChange} />

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={true}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <StatusIndicator
            status="idle"
            agentId={activeAgentId}
            message="Ready to help. Enter a prompt to get started."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingVertical: 12,
  },
  codeBlockWrapper: {
    marginHorizontal: 12,
  },
});
