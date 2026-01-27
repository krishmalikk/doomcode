import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAgentStore } from '../../store/agentStore';
import { useSessionStore } from '../../store/session';

export function AgentControls() {
  const { getActiveStatus, lastPrompt, pendingCommand } = useAgentStore();
  const { sendAgentControl, connected } = useSessionStore();

  const status = getActiveStatus();
  const isRunning = status === 'running' || status === 'waiting_input';
  const isIdle = status === 'idle';
  const canRetry = isIdle && lastPrompt !== null;
  const isPending = pendingCommand !== null;

  const handleStart = () => {
    if (!isPending) {
      sendAgentControl('start');
    }
  };

  const handleStop = () => {
    if (!isPending) {
      sendAgentControl('stop');
    }
  };

  const handleRetry = () => {
    if (!isPending && canRetry) {
      sendAgentControl('retry');
    }
  };

  if (!connected) {
    return (
      <View style={styles.container}>
        <Text style={styles.disconnectedText}>Not connected</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isPending ? (
        <View style={styles.pendingContainer}>
          <ActivityIndicator size="small" color="#ffffff" />
          <Text style={styles.pendingText}>
            {pendingCommand === 'start' && 'Starting...'}
            {pendingCommand === 'stop' && 'Stopping...'}
            {pendingCommand === 'retry' && 'Retrying...'}
            {pendingCommand === 'configure' && 'Configuring...'}
          </Text>
        </View>
      ) : (
        <>
          {isIdle && (
            <TouchableOpacity
              style={[styles.button, styles.startButton]}
              onPress={handleStart}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonIcon}>▶</Text>
              <Text style={styles.buttonText}>Run</Text>
            </TouchableOpacity>
          )}

          {isRunning && (
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={handleStop}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonIcon}>■</Text>
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
          )}

          {isIdle && (
            <TouchableOpacity
              style={[
                styles.button,
                styles.retryButton,
                !canRetry && styles.buttonDisabled,
              ]}
              onPress={handleRetry}
              disabled={!canRetry}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonIcon, !canRetry && styles.textDisabled]}>↻</Text>
              <Text style={[styles.buttonText, !canRetry && styles.textDisabled]}>Retry</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingText: {
    color: '#aaaaaa',
    fontSize: 12,
  },
  disconnectedText: {
    color: '#aaaaaa',
    fontSize: 12,
    fontStyle: 'italic',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  startButton: {
    backgroundColor: '#ffffff',
  },
  stopButton: {
    backgroundColor: '#ffffff',
  },
  retryButton: {
    backgroundColor: '#ffffff',
  },
  buttonDisabled: {
    backgroundColor: '#333333',
    opacity: 0.5,
  },
  buttonIcon: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  buttonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },
  textDisabled: {
    color: '#aaaaaa',
  },
});
