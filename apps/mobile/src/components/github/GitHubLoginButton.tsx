import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useGitHubStore } from '../../store/githubStore';
import { initiateGitHubOAuth, fetchGitHubUser } from '../../services/githubAuth';

interface Props {
  onError?: (error: string) => void;
}

export function GitHubLoginButton({ onError }: Props) {
  const { isAuthenticated, user, setAuth, setUser, clearAuth } = useGitHubStore();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await initiateGitHubOAuth();
      if (result.success && result.accessToken) {
        await setAuth(result.accessToken, result.scope || 'repo');

        // Try to fetch user info (may fail if we got a code instead of token)
        try {
          const userData = await fetchGitHubUser(result.accessToken);
          setUser(userData);
        } catch {
          // User info will be fetched later when connected to desktop
        }
      } else {
        onError?.(result.error || 'Login failed');
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearAuth();
  };

  if (isAuthenticated && user) {
    return (
      <View style={styles.loggedInContainer}>
        <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.username}>{user.login}</Text>
          {user.name && <Text style={styles.name}>{user.name}</Text>}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isAuthenticated && !user) {
    return (
      <View style={styles.loggedInContainer}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarPlaceholderText}>GH</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>Connected to GitHub</Text>
          <Text style={styles.name}>User info pending</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.loginButton}
      onPress={handleLogin}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <>
          <GitHubIcon />
          <Text style={styles.loginText}>Sign in with GitHub</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function GitHubIcon() {
  return (
    <View style={styles.iconContainer}>
      <Text style={styles.icon}>GH</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#24292e',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 10,
  },
  loginText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#24292e',
  },
  loggedInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#24292e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  name: {
    color: '#888888',
    fontSize: 14,
    marginTop: 2,
  },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  logoutText: {
    color: '#888888',
    fontSize: 14,
  },
});
