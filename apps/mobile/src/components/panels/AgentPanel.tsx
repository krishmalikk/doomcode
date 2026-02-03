import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import type { AgentId } from '@doomcode/protocol';
import { useAgentStore } from '../../store/agentStore';
import { AgentControls } from '../agent';

const AGENTS: { id: AgentId; name: string; description: string }[] = [
  { id: 'claude', name: 'Claude', description: 'Anthropic Claude - Best for complex reasoning' },
  { id: 'codex', name: 'Codex', description: 'OpenAI Codex - Great for code generation' },
  { id: 'gemini', name: 'Gemini', description: 'Google Gemini - Fast and versatile' },
];

interface Props {
  agentStatus: 'idle' | 'running' | 'waiting_input' | 'error';
  onClose?: () => void;
}

export function AgentPanel({ agentStatus, onClose }: Props) {
  const { activeAgentId, setActiveAgent } = useAgentStore();

  const handleSelectAgent = (id: AgentId) => {
    setActiveAgent(id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusSection}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              agentStatus === 'running' && styles.statusRunning,
              agentStatus === 'error' && styles.statusError,
            ]}
          />
          <Text style={styles.statusText}>
            {agentStatus === 'idle' && 'Idle'}
            {agentStatus === 'running' && 'Running'}
            {agentStatus === 'waiting_input' && 'Waiting for input'}
            {agentStatus === 'error' && 'Error'}
          </Text>
        </View>
        <AgentControls />
      </View>

      <ScrollView style={styles.list}>
        <Text style={styles.sectionTitle}>Select Agent</Text>
        {AGENTS.map((agent) => (
          <TouchableOpacity
            key={agent.id}
            style={[styles.agentItem, activeAgentId === agent.id && styles.agentItemActive]}
            onPress={() => handleSelectAgent(agent.id)}
          >
            <View style={styles.agentInfo}>
              <Text style={[styles.agentName, activeAgentId === agent.id && styles.agentNameActive]}>
                {agent.name}
              </Text>
              <Text style={styles.agentDescription}>{agent.description}</Text>
            </View>
            {activeAgentId === agent.id && <Text style={styles.checkmark}>OK</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statusSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#666666',
    marginRight: 10,
  },
  statusRunning: {
    backgroundColor: '#4ade80',
  },
  statusError: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  agentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  agentItemActive: {
    borderColor: '#4ade80',
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  agentNameActive: {
    color: '#4ade80',
  },
  agentDescription: {
    color: '#888888',
    fontSize: 13,
  },
  checkmark: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 12,
  },
});
