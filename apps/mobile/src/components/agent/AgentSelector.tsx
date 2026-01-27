import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import type { AgentId } from '@doomcode/protocol';
import { useAgentStore } from '../../store/agentStore';

interface AgentOption {
  id: AgentId;
  name: string;
  description: string;
  available: boolean;
}

const AGENT_OPTIONS: AgentOption[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    description: 'Anthropic Claude CLI agent',
    available: true,
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    description: 'OpenAI Codex CLI agent',
    available: true,
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    description: 'Google Gemini CLI agent',
    available: true,
  },
];

export function AgentSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { activeAgentId, setActiveAgent } = useAgentStore();

  const currentAgent = AGENT_OPTIONS.find((a) => a.id === activeAgentId) ?? AGENT_OPTIONS[0];

  const handleSelect = (agent: AgentOption) => {
    if (agent.available) {
      setActiveAgent(agent.id);
      setIsOpen(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <View style={styles.selectorContent}>
          <Text style={styles.agentName}>{currentAgent.name}</Text>
          <Text style={styles.chevron}>▼</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>Select Agent</Text>
            {AGENT_OPTIONS.map((agent) => (
              <TouchableOpacity
                key={agent.id}
                style={[
                  styles.option,
                  agent.id === activeAgentId && styles.optionSelected,
                  !agent.available && styles.optionDisabled,
                ]}
                onPress={() => handleSelect(agent)}
                disabled={!agent.available}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionName,
                      agent.id === activeAgentId && styles.optionNameSelected,
                      !agent.available && styles.optionNameDisabled,
                    ]}
                  >
                    {agent.name}
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      !agent.available && styles.optionNameDisabled,
                    ]}
                  >
                    {agent.description}
                  </Text>
                  {!agent.available && (
                    <Text style={styles.comingSoon}>Coming soon</Text>
                  )}
                </View>
                {agent.id === activeAgentId && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    backgroundColor: '#111111',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  agentName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  chevron: {
    color: '#aaaaaa',
    fontSize: 10,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdown: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#333333',
  },
  dropdownTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#000000',
  },
  optionSelected: {
    backgroundColor: '#111111',
    borderColor: '#ffffff',
    borderWidth: 1,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionContent: {
    flex: 1,
  },
  optionName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  optionNameSelected: {
    color: '#ffffff',
  },
  optionNameDisabled: {
    color: '#aaaaaa',
  },
  optionDescription: {
    color: '#aaaaaa',
    fontSize: 12,
    marginTop: 2,
  },
  comingSoon: {
    color: '#aaaaaa',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
