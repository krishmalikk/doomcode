import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useGitHubStore } from '../../store/githubStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreatePR: (params: {
    branchName: string;
    title: string;
    body: string;
    draft: boolean;
  }) => void;
  onShareToken: () => void;
  connected: boolean;
}

export function CreatePRModal({
  visible,
  onClose,
  onCreatePR,
  onShareToken,
  connected,
}: Props) {
  const {
    isAuthenticated,
    tokenSharedWithDesktop,
    pendingPRRequest,
    lastPRResult,
    clearPRResult,
  } = useGitHubStore();

  const [branchName, setBranchName] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [draft, setDraft] = useState(false);

  const canCreatePR = isAuthenticated && connected && tokenSharedWithDesktop && branchName.trim() && title.trim();
  const isCreating = !!pendingPRRequest;

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      clearPRResult();
    }
  }, [visible]);

  const handleCreatePR = () => {
    if (!canCreatePR) return;
    onCreatePR({
      branchName: branchName.trim(),
      title: title.trim(),
      body: body.trim(),
      draft,
    });
  };

  const handleOpenPR = () => {
    if (lastPRResult?.prUrl) {
      Linking.openURL(lastPRResult.prUrl);
    }
  };

  const handleClose = () => {
    setBranchName('');
    setTitle('');
    setBody('');
    setDraft(false);
    clearPRResult();
    onClose();
  };

  const suggestBranchName = () => {
    const timestamp = Date.now().toString(36);
    setBranchName(`doomcode/changes-${timestamp}`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Pull Request</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            {!isAuthenticated ? (
              <View style={styles.authRequired}>
                <Text style={styles.authIcon}>GH</Text>
                <Text style={styles.authTitle}>GitHub Sign In Required</Text>
                <Text style={styles.authText}>
                  Sign in with GitHub in Settings to create pull requests.
                </Text>
              </View>
            ) : !connected ? (
              <View style={styles.authRequired}>
                <Text style={styles.authIcon}>!</Text>
                <Text style={styles.authTitle}>Not Connected</Text>
                <Text style={styles.authText}>
                  Connect to your desktop to create pull requests.
                </Text>
              </View>
            ) : !tokenSharedWithDesktop ? (
              <View style={styles.authRequired}>
                <Text style={styles.authIcon}>GH</Text>
                <Text style={styles.authTitle}>Share Token with Desktop</Text>
                <Text style={styles.authText}>
                  Share your GitHub token with the desktop to enable PR creation.
                </Text>
                <TouchableOpacity style={styles.shareButton} onPress={onShareToken}>
                  <Text style={styles.shareButtonText}>Share Token</Text>
                </TouchableOpacity>
              </View>
            ) : lastPRResult?.success ? (
              <View style={styles.successContainer}>
                <Text style={styles.successIcon}>OK</Text>
                <Text style={styles.successTitle}>PR Created!</Text>
                <Text style={styles.successText}>
                  Pull request #{lastPRResult.prNumber} has been created.
                </Text>
                <TouchableOpacity style={styles.openPRButton} onPress={handleOpenPR}>
                  <Text style={styles.openPRButtonText}>Open in GitHub</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {lastPRResult?.error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{lastPRResult.error}</Text>
                  </View>
                )}

                <View style={styles.field}>
                  <Text style={styles.label}>Branch Name</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, styles.flexInput]}
                      value={branchName}
                      onChangeText={setBranchName}
                      placeholder="feature/my-changes"
                      placeholderTextColor="#666"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity style={styles.suggestButton} onPress={suggestBranchName}>
                      <Text style={styles.suggestText}>Suggest</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Add new feature"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Description (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={body}
                    onChangeText={setBody}
                    placeholder="Describe your changes..."
                    placeholderTextColor="#666"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity
                  style={styles.draftToggle}
                  onPress={() => setDraft(!draft)}
                >
                  <View style={[styles.checkbox, draft && styles.checkboxChecked]}>
                    {draft && <Text style={styles.checkmark}>OK</Text>}
                  </View>
                  <Text style={styles.draftText}>Create as draft PR</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.createButton, !canCreatePR && styles.createButtonDisabled]}
                  onPress={handleCreatePR}
                  disabled={!canCreatePR || isCreating}
                >
                  {isCreating ? (
                    <ActivityIndicator color="#000000" size="small" />
                  ) : (
                    <Text style={styles.createButtonText}>Create Pull Request</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  authRequired: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  authIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#24292e',
    width: 60,
    height: 60,
    borderRadius: 30,
    textAlign: 'center',
    lineHeight: 60,
    marginBottom: 16,
    overflow: 'hidden',
  },
  authTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  authText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 20,
  },
  shareButton: {
    backgroundColor: '#24292e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    backgroundColor: '#4caf50',
    width: 60,
    height: 60,
    borderRadius: 30,
    textAlign: 'center',
    lineHeight: 60,
    marginBottom: 16,
    overflow: 'hidden',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 20,
  },
  openPRButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  openPRButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#ff000020',
    borderWidth: 1,
    borderColor: '#ff000040',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
  },
  flexInput: {
    flex: 1,
  },
  textArea: {
    minHeight: 100,
  },
  suggestButton: {
    backgroundColor: '#333333',
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestText: {
    color: '#ffffff',
    fontSize: 14,
  },
  draftToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#333333',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  checkmark: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  draftText: {
    color: '#ffffff',
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  createButtonDisabled: {
    backgroundColor: '#333333',
  },
  createButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
