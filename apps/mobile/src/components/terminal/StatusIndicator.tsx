import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import type { AgentId } from '@doomcode/protocol';

type Status = 'idle' | 'running' | 'waiting_input' | 'error' | 'thinking';

interface Props {
  status: Status;
  agentId?: AgentId;
  message?: string;
}

const AGENT_LABELS: Record<AgentId, string> = {
  claude: 'Claude',
  codex: 'Codex',
  gemini: 'Gemini',
};

const STATUS_CONFIG: Record<Status, { color: string; text: string; icon: string }> = {
  idle: { color: '#6b7280', text: 'Ready', icon: '○' },
  running: { color: '#4ade80', text: 'Working', icon: '●' },
  waiting_input: { color: '#fbbf24', text: 'Waiting for input', icon: '◐' },
  error: { color: '#ef4444', text: 'Error', icon: '✕' },
  thinking: { color: '#4ade80', text: 'Thinking', icon: '◉' },
};

export function StatusIndicator({ status, agentId = 'claude', message }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'running' || status === 'thinking') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  const config = STATUS_CONFIG[status];
  const agentLabel = AGENT_LABELS[agentId];
  const displayMessage = message || config.text;

  return (
    <View style={styles.container}>
      <View style={[styles.statusBar, { borderLeftColor: config.color }]}>
        <Animated.View style={[styles.iconContainer, { opacity: pulseAnim }]}>
          {status === 'running' || status === 'thinking' ? (
            <ActivityIndicator size="small" color={config.color} />
          ) : (
            <Text style={[styles.icon, { color: config.color }]}>{config.icon}</Text>
          )}
        </Animated.View>

        <View style={styles.textContainer}>
          <Text style={styles.agentName}>{agentLabel}</Text>
          <Text style={[styles.statusText, { color: config.color }]}>{displayMessage}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 12,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 4,
    gap: 12,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  textContainer: {
    flex: 1,
  },
  agentName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 13,
  },
});
