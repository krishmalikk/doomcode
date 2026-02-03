import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { VoiceInputButton } from './VoiceInputButton';

interface SmartInputBarProps {
  onSend: (prompt: string) => void;
  disabled?: boolean;
}

export function SmartInputBar({ onSend, disabled }: SmartInputBarProps) {
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    if (prompt.trim() && !disabled) {
      onSend(prompt.trim());
      setPrompt('');
      Keyboard.dismiss();
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    setPrompt(transcript);
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        {/* Text Input */}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Ask the agent..."
          placeholderTextColor="#666666"
          selectionColor="#ffffff"
          cursorColor="#ffffff"
          returnKeyType="send"
          onSubmitEditing={handleSend}
          autoCapitalize="none"
          autoCorrect={false}
          blurOnSubmit={false}
          editable={!disabled}
          multiline={false}
        />

        {/* Voice Input Button */}
        <VoiceInputButton onTranscript={handleVoiceTranscript} disabled={disabled} />

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendButton, (!prompt.trim() || disabled) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!prompt.trim() || disabled}
          activeOpacity={0.7}
        >
          <Text style={[styles.sendIcon, (!prompt.trim() || disabled) && styles.sendIconDisabled]}>
            ^
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    borderTopWidth: 1,
    borderTopColor: '#222222',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 16,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4ade80',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#333333',
  },
  sendIcon: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sendIconDisabled: {
    color: '#666666',
  },
});
