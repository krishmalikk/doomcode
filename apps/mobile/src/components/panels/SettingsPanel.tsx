import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import type { ViewStyle, TextStyle } from 'react-native';
import { AgentSettingsPanel } from '../agent';
import { TerminalPrefsPanel } from '../settings/TerminalPrefsPanel';
import { GitHubSettingsPanel } from '../github';

type SettingsSection = 'agent' | 'terminal' | 'github';

interface Props {
  connected: boolean;
  onShareToken: () => void;
  onRevokeToken: () => void;
  onError?: (error: string) => void;
  onCreatePR?: () => void;
  githubAuthenticated?: boolean;
  tokenSharedWithDesktop?: boolean;
}

export function SettingsPanel({
  connected,
  onShareToken,
  onRevokeToken,
  onError,
  onCreatePR,
  githubAuthenticated,
  tokenSharedWithDesktop,
}: Props) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('agent');

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'agent' && styles.tabActive]}
          onPress={() => setActiveSection('agent')}
        >
          <Text style={[styles.tabText, activeSection === 'agent' && styles.tabTextActive]}>
            Agent
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'terminal' && styles.tabActive]}
          onPress={() => setActiveSection('terminal')}
        >
          <Text style={[styles.tabText, activeSection === 'terminal' && styles.tabTextActive]}>
            Terminal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'github' && styles.tabActive]}
          onPress={() => setActiveSection('github')}
        >
          <Text style={[styles.tabText, activeSection === 'github' && styles.tabTextActive]}>
            GitHub
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeSection === 'agent' && <AgentSettingsPanel />}
        {activeSection === 'terminal' && <TerminalPrefsPanel />}
        {activeSection === 'github' && (
          <View style={styles.githubSection}>
            <GitHubSettingsPanel
              connected={connected}
              onShareToken={onShareToken}
              onRevokeToken={onRevokeToken}
              onError={onError}
            />
            {githubAuthenticated && tokenSharedWithDesktop && onCreatePR && (
              <TouchableOpacity style={styles.createPrButton} onPress={onCreatePR}>
                <Text style={styles.createPrButtonText}>Create Pull Request</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
  },
  tabActive: {
    backgroundColor: '#4ade80',
    borderColor: '#4ade80',
  },
  tabText: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  githubSection: {
    flex: 1,
  },
  createPrButton: {
    backgroundColor: '#4ade80',
    borderRadius: 8,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  createPrButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
  },
});
