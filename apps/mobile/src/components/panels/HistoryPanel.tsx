import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAgentStore } from '../../store/agentStore';

interface Props {
  onSelectPrompt: (prompt: string) => void;
}

export function HistoryPanel({ onSelectPrompt }: Props) {
  const { lastPrompt } = useAgentStore();

  // For now, we only have lastPrompt. In the future, we could add a full history store.
  const history = lastPrompt ? [lastPrompt] : [];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.list}>
        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>H</Text>
            <Text style={styles.emptyTitle}>No History Yet</Text>
            <Text style={styles.emptyText}>
              Your recent prompts will appear here so you can quickly resend them.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Recent Prompts</Text>
            {history.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                style={styles.historyItem}
                onPress={() => onSelectPrompt(prompt)}
              >
                <Text style={styles.promptText} numberOfLines={2}>
                  {prompt}
                </Text>
                <Text style={styles.tapHint}>Tap to resend</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#222222',
  },
  promptText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  tapHint: {
    color: '#666666',
    fontSize: 12,
    marginTop: 8,
  },
});
