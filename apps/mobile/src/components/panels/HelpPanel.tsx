import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';

export function HelpPanel() {
  const handleOpenDocs = () => {
    Linking.openURL('https://github.com/yourusername/doomcode');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>DoomCode</Text>
          <Text style={styles.version}>v1.0.0</Text>
        </View>

        <Text style={styles.description}>
          Control your AI coding agent from anywhere. DoomCode lets you send prompts, review code
          changes, and manage your development session from your mobile device.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Tips</Text>

          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>AI</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Agent</Text>
              <Text style={styles.tipText}>Switch between AI agents and control execution</Text>
            </View>
          </View>

          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>{'{}'}</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Commands</Text>
              <Text style={styles.tipText}>Quick access to agent commands like /help, /compact</Text>
            </View>
          </View>

          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>H</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>History</Text>
              <Text style={styles.tipText}>View and resend recent prompts</Text>
            </View>
          </View>

          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>*</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Settings</Text>
              <Text style={styles.tipText}>Configure agent, terminal, and GitHub settings</Text>
            </View>
          </View>

          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>D</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Diffs</Text>
              <Text style={styles.tipText}>Review and approve code changes</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.docsButton} onPress={handleOpenDocs}>
          <Text style={styles.docsButtonText}>View Documentation</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  version: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    color: '#888888',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 36,
    marginRight: 12,
    overflow: 'hidden',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#888888',
  },
  docsButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  docsButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
