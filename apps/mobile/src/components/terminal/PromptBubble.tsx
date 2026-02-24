import { View, Text, StyleSheet } from 'react-native';

interface Props {
  prompt: string;
  timestamp?: number;
}

export function PromptBubble({ prompt, timestamp }: Props) {
  const timeStr = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>You</Text>
        {timeStr && <Text style={styles.time}>{timeStr}</Text>}
      </View>
      <View style={styles.bubble}>
        <Text style={styles.text}>{prompt}</Text>
      </View>
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
    marginBottom: 6,
    gap: 8,
  },
  label: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
  },
  time: {
    color: '#666666',
    fontSize: 11,
  },
  bubble: {
    backgroundColor: '#1e3a2f',
    borderRadius: 12,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '90%',
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
});
