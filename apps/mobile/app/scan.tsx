import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { decodeQRPayload, type QRCodePayload } from '@doomcode/protocol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSessionStore } from '../src/store/session';

const LAST_SESSION_KEY = 'doomcode:last-session';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [lastPayload, setLastPayload] = useState<QRCodePayload | null>(null);
  const { connect, disconnect, connected, sessionId: currentSessionId } = useSessionStore();
  const isDev = __DEV__ === true;

  const devPayload = useMemo<QRCodePayload | null>(() => {
    if (!__DEV__) return null;

    const qr = process.env.EXPO_PUBLIC_DOOMCODE_DEV_QR;
    if (qr) {
      return decodeQRPayload(qr);
    }

    const rawPayload = process.env.EXPO_PUBLIC_DOOMCODE_DEV_PAYLOAD;
    if (rawPayload) {
      try {
        const parsed = JSON.parse(rawPayload) as QRCodePayload;
        return parsed;
      } catch {
        return null;
      }
    }

    const sessionId = process.env.EXPO_PUBLIC_DOOMCODE_DEV_SESSION_ID;
    const relayUrl = process.env.EXPO_PUBLIC_DOOMCODE_DEV_RELAY_URL;
    const publicKey = process.env.EXPO_PUBLIC_DOOMCODE_DEV_PUBLIC_KEY;
    if (sessionId && relayUrl && publicKey) {
      return {
        sessionId,
        relayUrl,
        publicKey,
        // Give dev payloads a long TTL so they don't auto-expire in simulator workflows.
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
      };
    }

    return null;
  }, []);

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (alertVisible) return;
    setAlertVisible(true);
    Alert.alert(title, message, [
      {
        text: 'OK',
        onPress: () => {
          setAlertVisible(false);
          onOk?.();
        },
      },
    ]);
  };

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    const loadLastSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(LAST_SESSION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as QRCodePayload;
          setLastPayload(parsed);
        }
      } catch {
        // ignore
      }
    };

    loadLastSession();
  }, []);

  const persistLastPayload = useCallback(async (payload: QRCodePayload) => {
    try {
      await AsyncStorage.setItem(LAST_SESSION_KEY, JSON.stringify(payload));
      setLastPayload(payload);
    } catch {
      // ignore
    }
  }, []);

  const handleConnectError = useCallback(
    (message: string, payload: QRCodePayload) => {
      if (message.includes('ALREADY_CONNECTED') && currentSessionId === payload.sessionId) {
        router.replace('/session');
        return;
      }

      if (message.includes('ALREADY_CONNECTED')) {
        // Likely a stale mobile connection on the relay; force local reset and rescan.
        disconnect();
        showAlert('Already connected', 'A mobile is already connected. Please rescan the QR code.', () => {
          setScanned(false);
        });
        return;
      }

      showAlert('Failed to connect', message, () => {
        setScanned(false);
      });
    },
    [currentSessionId, disconnect, router, showAlert]
  );

  const connectWithPayload = useCallback(
    async (payload: QRCodePayload) => {
      const isDevPayload =
        __DEV__ &&
        devPayload &&
        payload.sessionId === devPayload.sessionId &&
        payload.publicKey === devPayload.publicKey &&
        payload.relayUrl === devPayload.relayUrl;

      // Check if expired
      if (!isDevPayload && payload.expiresAt < Date.now()) {
        showAlert('QR code expired', 'Please regenerate on desktop.', () => {
          setScanned(false);
        });
        return;
      }

      // If we're already connected to this exact session on this device,
      // don't attempt a second join (relay will respond ALREADY_CONNECTED).
      if (connected && currentSessionId === payload.sessionId) {
        router.replace('/session');
        return;
      }

      // If we're connected to a different session, disconnect first.
      if (connected && currentSessionId && currentSessionId !== payload.sessionId) {
        disconnect();
      }

      try {
        await connect(payload);
        await persistLastPayload(payload);
        router.replace('/session');
      } catch (error) {
        const message = (error as Error).message ?? String(error);
        handleConnectError(message, payload);
      }
    },
    [
      connected,
      connect,
      currentSessionId,
      disconnect,
      handleConnectError,
      persistLastPayload,
      router,
      showAlert,
      devPayload,
    ]
  );

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    const payload = decodeQRPayload(data);
    if (!payload) {
      showAlert('Invalid QR code', 'Please scan the DoomCode QR from your desktop.', () => {
        setScanned(false);
      });
      return;
    }

    await connectWithPayload(payload);
  };

  const handleReconnect = async () => {
    if (!lastPayload || scanned) return;
    setScanned(true);

    await connectWithPayload(lastPayload);
  };

  const handleDevConnect = async () => {
    if (scanned) return;
    if (!devPayload) {
      showAlert(
        'Developer connect unavailable',
        'Set EXPO_PUBLIC_DOOMCODE_DEV_QR (preferred) or EXPO_PUBLIC_DOOMCODE_DEV_SESSION_ID/RELAY_URL/PUBLIC_KEY, then reload the app.'
      );
      return;
    }
    setScanned(true);
    await connectWithPayload(devPayload);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera access is required to scan QR codes.</Text>
        {isDev && (
          <TouchableOpacity style={styles.devButton} onPress={handleDevConnect}>
            <Text style={styles.devButtonText}>Developer connect (no QR)</Text>
          </TouchableOpacity>
        )}
        {!!lastPayload && (
          <TouchableOpacity style={styles.reconnectButton} onPress={handleReconnect}>
            <Text style={styles.reconnectButtonText}>Reconnect last session</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.instruction}>
            Point your camera at the QR code on your desktop
          </Text>
          {lastPayload && (
            <TouchableOpacity style={styles.reconnectButton} onPress={handleReconnect}>
              <Text style={styles.reconnectButtonText}>Reconnect last session</Text>
            </TouchableOpacity>
          )}
          {isDev && (
            <TouchableOpacity style={styles.devButton} onPress={handleDevConnect}>
              <Text style={styles.devButtonText}>Developer connect (no QR)</Text>
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#ffffff',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instruction: {
    color: '#fff',
    fontSize: 16,
    marginTop: 30,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  reconnectButton: {
    marginTop: 16,
    backgroundColor: '#111111',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  reconnectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  devButton: {
    marginTop: 12,
    backgroundColor: '#111111',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  devButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
