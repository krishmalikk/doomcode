import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceInput } from '../../hooks/useVoiceInput';

interface VoiceInputButtonProps {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
}

export function VoiceInputButton({ onTranscript, disabled }: VoiceInputButtonProps) {
  const {
    isListening,
    isProcessing,
    error,
    startListening,
    stopListening,
    clearError,
  } = useVoiceInput({
    onTranscript,
    onError: (err) => console.warn('Voice input error:', err),
  });

  const handlePress = async () => {
    if (disabled) return;

    if (error) {
      clearError();
      return;
    }

    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  };

  const handleLongPress = async () => {
    if (disabled) return;
    await startListening();
  };

  const handlePressOut = async () => {
    if (isListening) {
      await stopListening();
    }
  };

  const getButtonStyle = () => {
    if (disabled) return [styles.button, styles.buttonDisabled];
    return [styles.button];
  };

  const getIcon = () => {
    if (isProcessing) {
      return <ActivityIndicator size="small" color="#fff" />;
    }
    return <Ionicons name="mic" size={20} color="#fff" />;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressOut={handlePressOut}
      disabled={disabled || isProcessing}
      activeOpacity={0.7}
      delayLongPress={200}
    >
      {getIcon()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  buttonDisabled: {
    backgroundColor: '#333333',
    opacity: 0.5,
  },
});
