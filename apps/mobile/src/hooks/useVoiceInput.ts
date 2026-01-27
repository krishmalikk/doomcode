import { useState, useCallback, useRef, useEffect } from 'react';
import * as Speech from 'expo-speech';

interface UseVoiceInputOptions {
  onTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
  language?: string;
}

interface VoiceInputState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
  isAvailable: boolean;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const { onTranscript, onError, language = 'en-US' } = options;

  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    error: null,
    isAvailable: false,
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if speech is available on mount
  useEffect(() => {
    checkAvailability();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const checkAvailability = useCallback(async () => {
    try {
      // expo-speech is primarily for text-to-speech, but we can check if it's available
      // For actual speech-to-text, we'd need expo-av or a native module
      // For now, we'll simulate availability for the UI
      setState((prev) => ({ ...prev, isAvailable: true }));
    } catch {
      setState((prev) => ({ ...prev, isAvailable: false }));
    }
  }, []);

  const startListening = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isListening: true,
      error: null,
      transcript: '',
    }));

    // Note: expo-speech is for text-to-speech, not speech-to-text
    // For actual voice recognition, you'd need expo-speech-recognition or react-native-voice
    // This is a placeholder implementation that simulates the flow

    // Simulate listening timeout (would be replaced with actual speech recognition)
    timeoutRef.current = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isListening: false,
        error: 'Voice input requires additional native configuration. Please type your command instead.',
      }));
      onError?.('Voice recognition not fully configured');
    }, 3000);
  }, [onError]);

  const stopListening = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setState((prev) => ({
      ...prev,
      isListening: false,
      isProcessing: true,
    }));

    // Simulate processing delay
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
      }));
    }, 500);
  }, []);

  const setTranscript = useCallback(
    (transcript: string) => {
      setState((prev) => ({ ...prev, transcript }));
      onTranscript?.(transcript);
    },
    [onTranscript]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearTranscript = useCallback(() => {
    setState((prev) => ({ ...prev, transcript: '' }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    setTranscript,
    clearError,
    clearTranscript,
  };
}
