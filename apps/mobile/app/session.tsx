import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSessionStore } from '../src/store/session';
import { useAgentStore } from '../src/store/agentStore';
import { TerminalView } from '../src/components/TerminalView';
import { PermissionModal } from '../src/components/PermissionModal';
import { YesNoModal } from '../src/components/YesNoModal';
import { DiffViewer } from '../src/components/DiffViewer';
import { PatchHistory } from '../src/components/diff/PatchHistory';
import { Toast } from '../src/components/Toast';
import { AgentSelector, AgentControls, AgentSettingsPanel } from '../src/components/agent';
import { SmartInputBar } from '../src/components/input';

type TabType = 'terminal' | 'diffs' | 'settings';

// Patterns that indicate a yes/no question from AI
const YES_NO_PATTERNS = [
  /\(y\/n\)/i,
  /\[y\/n\]/i,
  /\[yes\/no\]/i,
  /\(yes\/no\)/i,
  /proceed\?/i,
  /continue\?/i,
  /confirm\?/i,
  /do you want to proceed/i,
  /would you like to proceed/i,
  /should i proceed/i,
  /do you want me to/i,
  /would you like me to/i,
  /shall i/i,
];

function detectYesNoQuestion(text: string): string | null {
  // Check if any pattern matches
  for (const pattern of YES_NO_PATTERNS) {
    if (pattern.test(text)) {
      // Extract the question (last sentence or line containing the pattern)
      const lines = text.split('\n').filter(l => l.trim());
      for (let i = lines.length - 1; i >= 0; i--) {
        if (pattern.test(lines[i])) {
          return lines[i].trim();
        }
      }
      return text.trim();
    }
  }
  return null;
}

export default function SessionScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('terminal');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'info' | 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'info',
  });
  const [yesNoQuestion, setYesNoQuestion] = useState<string | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

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

  // Detect yes/no questions from terminal output
  useEffect(() => {
    if (terminalOutput.length === 0) return;

    // Check the last few messages for yes/no questions
    const recentOutput = terminalOutput.slice(-5);
    for (const msg of recentOutput.reverse()) {
      const question = detectYesNoQuestion(msg.data);
      if (question && !answeredQuestions.has(question)) {
        setYesNoQuestion(question);
        break;
      }
    }
  }, [terminalOutput, answeredQuestions]);

  const handleYesNoResponse = (response: 'yes' | 'no') => {
    if (yesNoQuestion) {
      setAnsweredQuestions(prev => new Set(prev).add(yesNoQuestion));
      sendPrompt(response);
      setYesNoQuestion(null);
    }
  };

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ visible: true, message, type });
  };

  const handleSendPrompt = (prompt: string) => {
    console.log('Sending prompt:', prompt);
    sendPrompt(prompt);
    setLastPrompt(prompt);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
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

      {/* Yes/No Question Modal */}
      <YesNoModal
        visible={!!yesNoQuestion}
        question={yesNoQuestion || ''}
        onYes={() => handleYesNoResponse('yes')}
        onNo={() => handleYesNoResponse('no')}
      />
    </KeyboardAvoidingView>
    </View>
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
