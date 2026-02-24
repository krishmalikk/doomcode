import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { AgentId } from '@doomcode/protocol';
import { useAgentStore } from '../../store/agentStore';

interface AgentTab {
  id: AgentId;
  label: string;
}

const AGENTS: AgentTab[] = [
  { id: 'claude', label: 'Claude' },
  { id: 'codex', label: 'Codex' },
  { id: 'gemini', label: 'Gemini' },
];

interface Props {
  onAgentChange?: (agentId: AgentId) => void;
}

export function AgentTabBar({ onAgentChange }: Props) {
  const { activeAgentId, setActiveAgent, statuses } = useAgentStore();

  const handleTabPress = (agentId: AgentId) => {
    if (agentId !== activeAgentId) {
      setActiveAgent(agentId);
      onAgentChange?.(agentId);
    }
  };

  const getStatusColor = (agentId: AgentId): string => {
    const status = statuses[agentId];
    switch (status) {
      case 'running':
        return '#4ade80'; // green
      case 'waiting_input':
        return '#fbbf24'; // yellow
      case 'error':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  return (
    <View style={styles.container}>
      {AGENTS.map((agent) => {
        const isActive = agent.id === activeAgentId;
        const statusColor = getStatusColor(agent.id);

        return (
          <TouchableOpacity
            key={agent.id}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => handleTabPress(agent.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.tabText, isActive && styles.activeTabText]}>
              {agent.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    gap: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#262626',
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#3b3b3b',
    borderWidth: 1,
    borderColor: '#4ade80',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tabText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
