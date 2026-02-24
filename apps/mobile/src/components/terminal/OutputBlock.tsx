import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState, useMemo } from 'react';
import { ANSIText } from './ANSIText';
import type { AgentId } from '@doomcode/protocol';

interface Props {
  content: string;
  agentId?: AgentId;
  timestamp?: number;
  collapsible?: boolean;
  maxLines?: number;
}

const AGENT_LABELS: Record<AgentId, string> = {
  claude: 'Claude',
  codex: 'Codex',
  gemini: 'Gemini',
};

const AGENT_COLORS: Record<AgentId, string> = {
  claude: '#f97316', // orange
  codex: '#3b82f6', // blue
  gemini: '#8b5cf6', // purple
};

export function OutputBlock({
  content,
  agentId = 'claude',
  timestamp,
  collapsible = false,
  maxLines = 20,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const lines = useMemo(() => content.split('\n'), [content]);
  const shouldCollapse = collapsible && lines.length > maxLines;
  const displayContent = useMemo(() => {
    if (shouldCollapse && !isExpanded) {
      return lines.slice(0, maxLines).join('\n');
    }
    return content;
  }, [content, shouldCollapse, isExpanded, lines, maxLines]);

  const timeStr = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const agentColor = AGENT_COLORS[agentId];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.agentBadge, { backgroundColor: agentColor + '20' }]}>
          <View style={[styles.agentDot, { backgroundColor: agentColor }]} />
          <Text style={[styles.agentLabel, { color: agentColor }]}>
            {AGENT_LABELS[agentId]}
          </Text>
        </View>
        {timeStr && <Text style={styles.time}>{timeStr}</Text>}
      </View>

      <View style={styles.outputContainer}>
        <ANSIText text={displayContent} />
      </View>

      {shouldCollapse && (
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <Text style={styles.expandText}>
            {isExpanded
              ? 'Show less'
              : `Show ${lines.length - maxLines} more lines`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  agentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  agentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  agentLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  time: {
    color: '#666666',
    fontSize: 11,
  },
  outputContainer: {
    backgroundColor: '#111111',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#333333',
  },
  expandButton: {
    marginTop: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  expandText: {
    color: '#4ade80',
    fontSize: 13,
    fontWeight: '500',
  },
});
