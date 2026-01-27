import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSessionStore } from '../src/store/session';
import { useAgentStore } from '../src/store/agentStore';
import { TerminalView } from '../src/components/TerminalView';
import { PermissionModal } from '../src/components/PermissionModal';
import { DiffViewer } from '../src/components/DiffViewer';
import { PatchHistory } from '../src/components/diff/PatchHistory';
import { Toast } from '../src/components/Toast';
import { AgentSelector, AgentControls, AgentSettingsPanel } from '../src/components/agent';
import { SmartInputBar } from '../src/components/input';

type TabType = 'terminal' | 'diffs' | 'settings';

export default function SessionScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('terminal');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'info' | 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'info',
  });
  const headerHeight = useHeaderHeight();

  const {
    terminalOutput,
    pendingPermissions,
    pendingDiffs,
    agentStatus,
    sendPrompt,
    respondToPermission,
    respondToDiff,
    connected,
  } = useSessionStore();

  const { setLastPrompt } = useAgentStore();
  const currentPermission = pendingPermissions[0];

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ visible: true, message, type });
  };

  const handleSendPrompt = (prompt: string) => {
    console.log('Sending prompt:', prompt);
    sendPrompt(prompt);
    setLastPrompt(prompt);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <AgentSelector />
        <View style={styles.statusInfo}>
          <View style={[styles.statusDot, agentStatus === 'running' && styles.statusRunning]} />
          <Text style={styles.statusText}>
            {agentStatus === 'idle' && 'Idle'}
            {agentStatus === 'running' && 'Running'}
            {agentStatus === 'waiting_input' && 'Waiting'}
            {agentStatus === 'error' && 'Error'}
          </Text>
        </View>
        <AgentControls />
        {pendingPermissions.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingPermissions.length}</Text>
          </View>
        )}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'terminal' && styles.activeTab]}
          onPress={() => setActiveTab('terminal')}
        >
          <Text style={[styles.tabText, activeTab === 'terminal' && styles.activeTabText]}>
            Terminal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'diffs' && styles.activeTab]}
          onPress={() => setActiveTab('diffs')}
        >
          <Text style={[styles.tabText, activeTab === 'diffs' && styles.activeTabText]}>
            Diffs {pendingDiffs.length > 0 && `(${pendingDiffs.length})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

        {/* Content Area - Flex to fill available space */}
      <View style={styles.content}>
        {activeTab === 'terminal' && <TerminalView output={terminalOutput} />}
        {activeTab === 'diffs' && (
          <ScrollView style={styles.diffList}>
            {pendingDiffs.length === 0 ? (
              <Text style={styles.emptyText}>No pending diffs to review</Text>
            ) : (
              pendingDiffs.map((diff) => (
                <DiffViewer
                  key={diff.patchId}
                  diff={diff}
                  onApprove={() => respondToDiff(diff.patchId, 'apply')}
                  onReject={() => respondToDiff(diff.patchId, 'reject')}
                />
              ))
            )}
            {/* Patch History for Undo */}
            <PatchHistory />
          </ScrollView>
        )}
        {activeTab === 'settings' && <AgentSettingsPanel />}
      </View>

      {/* Smart Input Bar */}
      <SmartInputBar onSend={handleSendPrompt} disabled={!connected} />

      {/* Permission Modal */}
      {currentPermission && (
        <PermissionModal
          permission={currentPermission}
          onApprove={() => respondToPermission(currentPermission.requestId, 'approve')}
          onDeny={() => respondToPermission(currentPermission.requestId, 'deny')}
          onAlwaysApprove={() =>
            respondToPermission(currentPermission.requestId, 'approve_always')
          }
        />
      )}
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    gap: 12,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    marginRight: 6,
  },
  statusRunning: {
    backgroundColor: '#ffffff',
  },
  statusText: {
    color: '#aaaaaa',
    fontSize: 12,
  },
  badge: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111111',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#ffffff',
  },
  tabText: {
    color: '#aaaaaa',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  diffList: {
    flex: 1,
    padding: 12,
  },
  emptyText: {
    color: '#aaaaaa',
    textAlign: 'center',
    marginTop: 40,
  },
});
