import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GitHubLoginButton } from '../src/components/github/GitHubLoginButton';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [authError, setAuthError] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Doomcode</Text>
        <Text style={styles.subtitle}>Control your AI coding agent from anywhere</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.button} onPress={() => router.push('/scan')}>
          <Text style={styles.buttonText}>Scan QR Code</Text>
          <Text style={styles.buttonSubtext}>Pair with your desktop</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.githubSection}>
          <GitHubLoginButton onError={(error) => setAuthError(error)} />
          {authError && <Text style={styles.errorText}>{authError}</Text>}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoNumber}>1</Text>
            <View style={styles.infoBody}>
              <Text style={styles.infoText}>Run this in your desktop terminal</Text>
              <View style={styles.terminalBlock}>
                <Text style={styles.terminalText}>$ doomcode start</Text>
              </View>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoNumber}>2</Text>
            <Text style={styles.infoText}>Scan the QR code displayed</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoNumber}>3</Text>
            <Text style={styles.infoText}>Control your coding agent from your phone</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  button: {
    backgroundColor: '#000000',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#888888',
    fontSize: 14,
  },
  githubSection: {
    marginBottom: 30,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSubtext: {
    color: '#cccccc',
    fontSize: 14,
    marginTop: 4,
  },
  infoSection: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoBody: {
    flex: 1,
  },
  infoNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000000',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: 'bold',
    marginRight: 12,
  },
  infoText: {
    color: '#666666',
    fontSize: 14,
    flex: 1,
  },
  terminalBlock: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  terminalText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Menlo',
  },
});
