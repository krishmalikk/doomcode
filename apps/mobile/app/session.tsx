import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSessionStore } from '../src/store/session';
import { useAgentStore } from '../src/store/agentStore';
import { useGitHubStore } from '../src/store/githubStore';
import { TerminalView } from '../src/components/TerminalView';
import { PermissionModal } from '../src/components/PermissionModal';
import { YesNoModal } from '../src/components/YesNoModal';
import { Toast } from '../src/components/Toast';
import { SmartInputBar } from '../src/components/input';
import { CreatePRModal } from '../src/components/github';
import { BottomToolbar } from '../src/components/BottomToolbar';
import { SlideUpPanel } from '../src/components/SlideUpPanel';
import {
  CommandsPanel,
  SettingsPanel,
  DiffsPanel,
  HistoryPanel,
  AgentPanel,
  HelpPanel,
} from '../src/components/panels';

type PanelType = 'agent' | 'commands' | 'history' | 'settings' | 'diffs' | 'help' | null;

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
  for (const pattern of YES_NO_PATTERNS) {
    if (pattern.test(text)) {
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
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'info' | 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'info',
  });
  const [yesNoQuestion, setYesNoQuestion] = useState<string | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [showCreatePR, setShowCreatePR] = useState(false);

  const {
    terminalOutput,
    pendingPermissions,
    pendingDiffs,
    agentStatus,
    sendPrompt,
    respondToPermission,
    respondToDiff,
    connected,
    sendGitHubToken,
    revokeGitHubToken,
    requestCreatePR,
  } = useSessionStore();

  const { activeAgentId, setLastPrompt } = useAgentStore();
  const { isAuthenticated: githubAuthenticated, tokenSharedWithDesktop } = useGitHubStore();
  const currentPermission = pendingPermissions[0];
  const router = useRouter();
  const { disconnect } = useSessionStore();

  const handleEndSession = () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to disconnect from this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: () => {
            disconnect();
            router.replace('/');
          },
        },
      ]
    );
  };

  // Detect yes/no questions from terminal output
  useEffect(() => {
    if (terminalOutput.length === 0) return;

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

  const togglePanel = (panel: PanelType) => {
    setActivePanel(current => current === panel ? null : panel);
  };

  const handleSelectCommand = (command: string) => {
    // Send the command directly
    sendPrompt(command);
    setLastPrompt(command);
    setActivePanel(null);
  };

  const handleSelectPrompt = (prompt: string) => {
    // Send the prompt directly
    sendPrompt(prompt);
    setLastPrompt(prompt);
    setActivePanel(null);
  };

  const handleDiffApprove = (patchId: string) => {
    respondToDiff(patchId, 'apply');
  };

  const handleDiffReject = (patchId: string) => {
    respondToDiff(patchId, 'reject');
  };

  const getPanelTitle = () => {
    switch (activePanel) {
      case 'agent': return 'Agent';
      case 'commands': return 'Commands';
      case 'history': return 'History';
      case 'settings': return 'Settings';
      case 'diffs': return 'Diffs';
      case 'help': return 'Help';
      default: return '';
    }
  };

  const renderPanelContent = () => {
    switch (activePanel) {
      case 'agent':
        return <AgentPanel agentStatus={agentStatus} onClose={() => setActivePanel(null)} />;
      case 'commands':
        return <CommandsPanel onSelectCommand={handleSelectCommand} />;
      case 'history':
        return <HistoryPanel onSelectPrompt={handleSelectPrompt} />;
      case 'settings':
        return (
          <SettingsPanel
            connected={connected}
            onShareToken={sendGitHubToken}
            onRevokeToken={revokeGitHubToken}
            onError={(error) => showToast(error, 'error')}
            onCreatePR={() => {
              setActivePanel(null);
              setShowCreatePR(true);
            }}
            githubAuthenticated={githubAuthenticated}
            tokenSharedWithDesktop={tokenSharedWithDesktop}
          />
        );
      case 'diffs':
        return (
          <DiffsPanel
            pendingDiffs={pendingDiffs}
            onApprove={handleDiffApprove}
            onReject={handleDiffReject}
          />
        );
      case 'help':
        return <HelpPanel />;
      default:
        return null;
    }
  };

  // Get agent display name
  const getAgentDisplayName = () => {
    switch (activeAgentId) {
      case 'claude': return 'Claude';
      case 'codex': return 'Codex';
      case 'gemini': return 'Gemini';
      default: return 'Agent';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Toast Notification */}
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
        />

        {/* Minimal Status Header */}
        <View style={styles.statusHeader}>
          <View style={styles.statusLeft}>
            <View
              style={[
                styles.statusDot,
                agentStatus === 'running' && styles.statusRunning,
                agentStatus === 'error' && styles.statusError,
                !connected && styles.statusDisconnected,
              ]}
            />
            <Text style={styles.agentName}>{getAgentDisplayName()}</Text>
            <Text style={[
              styles.statusText,
              agentStatus === 'running' && styles.statusTextRunning,
              agentStatus === 'error' && styles.statusTextError,
              !connected && styles.statusTextDisconnected,
            ]}>
              {!connected ? 'Disconnected' :
               agentStatus === 'running' ? 'Active' :
               agentStatus === 'error' ? 'Error' :
               agentStatus === 'waiting_input' ? 'Waiting' : 'Idle'}
            </Text>
          </View>
          <View style={styles.statusRight}>
            {pendingPermissions.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingPermissions.length}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.endButton} onPress={handleEndSession}>
              <Text style={styles.endButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Full-Height Terminal View */}
        <View style={styles.terminalContainer}>
          <TerminalView output={terminalOutput} />
        </View>

        {/* Slide-up Panel */}
        <SlideUpPanel
          visible={activePanel !== null}
          onClose={() => setActivePanel(null)}
          title={getPanelTitle()}
        >
          {renderPanelContent()}
        </SlideUpPanel>

        {/* Smart Input Bar */}
        <SmartInputBar
          onSend={handleSendPrompt}
          disabled={!connected}
        />

        {/* Bottom Toolbar */}
        <BottomToolbar
          onAgentPress={() => togglePanel('agent')}
          onCommandsPress={() => togglePanel('commands')}
          onHistoryPress={() => togglePanel('history')}
          onSettingsPress={() => togglePanel('settings')}
          onDiffsPress={() => togglePanel('diffs')}
          onHelpPress={() => togglePanel('help')}
          activeItem={activePanel}
          diffCount={pendingDiffs.length}
          agentName={getAgentDisplayName()}
        />

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

        {/* Create PR Modal */}
        <CreatePRModal
          visible={showCreatePR}
          onClose={() => setShowCreatePR(false)}
          onCreatePR={(params) => requestCreatePR(params)}
          onShareToken={sendGitHubToken}
          connected={connected}
        />
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
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#666666',
  },
  statusRunning: {
    backgroundColor: '#4ade80',
  },
  statusError: {
    backgroundColor: '#ef4444',
  },
  statusDisconnected: {
    backgroundColor: '#ef4444',
  },
  agentName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    color: '#666666',
    fontSize: 13,
    marginLeft: 4,
  },
  statusTextRunning: {
    color: '#4ade80',
  },
  statusTextError: {
    color: '#ef4444',
  },
  statusTextDisconnected: {
    color: '#ef4444',
  },
  badge: {
    backgroundColor: '#4ade80',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  endButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#442222',
  },
  endButtonText: {
    color: '#cc4444',
    fontSize: 14,
    fontWeight: '600',
  },
  terminalContainer: {
    flex: 1,
  },
});
