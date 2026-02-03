import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { GitHubLoginButton } from './GitHubLoginButton';
import { useGitHubStore } from '../../store/githubStore';

interface Props {
  connected: boolean;
  onShareToken: () => void;
  onRevokeToken: () => void;
  onError?: (error: string) => void;
}

export function GitHubSettingsPanel({
  connected,
  onShareToken,
  onRevokeToken,
  onError,
}: Props) {
  const { isAuthenticated, tokenSharedWithDesktop, tokenScope } = useGitHubStore();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <GitHubLoginButton onError={onError} />
      </View>

      {isAuthenticated && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desktop Connection</Text>
          <View style={styles.connectionCard}>
            <View style={styles.connectionRow}>
              <View
                style={[
                  styles.statusDot,
                  tokenSharedWithDesktop ? styles.statusConnected : styles.statusDisconnected,
                ]}
              />
              <View style={styles.connectionInfo}>
                <Text style={styles.connectionStatus}>
                  {tokenSharedWithDesktop
                    ? 'Token shared with desktop'
                    : 'Token not shared'}
                </Text>
                <Text style={styles.connectionDetail}>
                  {connected
                    ? tokenSharedWithDesktop
                      ? 'Ready to create pull requests'
                      : 'Share token to enable PR creation'
                    : 'Connect to desktop first'}
                </Text>
              </View>
            </View>

            {connected && !tokenSharedWithDesktop && (
              <TouchableOpacity style={styles.shareButton} onPress={onShareToken}>
                <Text style={styles.shareButtonText}>Share Token</Text>
              </TouchableOpacity>
            )}

            {tokenSharedWithDesktop && (
              <TouchableOpacity style={styles.revokeButton} onPress={onRevokeToken}>
                <Text style={styles.revokeButtonText}>Revoke Token</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutText}>
            DoomCode uses GitHub OAuth to create pull requests on your behalf.
            Your token is stored securely on your device and transmitted via
            encrypted connection to your desktop.
          </Text>

          {tokenScope && (
            <View style={styles.scopeSection}>
              <Text style={styles.scopeTitle}>Granted Permissions</Text>
              <Text style={styles.scopeText}>{tokenScope}</Text>
            </View>
          )}

          <View style={styles.scopeSection}>
            <Text style={styles.scopeTitle}>Required Permissions</Text>
            <View style={styles.permissionItem}>
              <Text style={styles.permissionName}>repo</Text>
              <Text style={styles.permissionDesc}>
                Full access to repositories (required to create PRs)
              </Text>
            </View>
            <View style={styles.permissionItem}>
              <Text style={styles.permissionName}>read:user</Text>
              <Text style={styles.permissionDesc}>
                Read user profile information
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  connectionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 16,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  statusConnected: {
    backgroundColor: '#4caf50',
  },
  statusDisconnected: {
    backgroundColor: '#888888',
  },
  connectionInfo: {
    flex: 1,
  },
  connectionStatus: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  connectionDetail: {
    color: '#888888',
    fontSize: 14,
    marginTop: 4,
  },
  shareButton: {
    backgroundColor: '#24292e',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  revokeButton: {
    backgroundColor: '#333333',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  revokeButtonText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
  },
  aboutCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 16,
  },
  aboutText: {
    color: '#888888',
    fontSize: 14,
    lineHeight: 20,
  },
  scopeSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  scopeTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  scopeText: {
    color: '#888888',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  permissionItem: {
    marginBottom: 12,
  },
  permissionName: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  permissionDesc: {
    color: '#888888',
    fontSize: 13,
    marginTop: 2,
  },
});
