import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommandPalette } from './CommandPalette';
import { VoiceInputButton } from './VoiceInputButton';
import { getSuggestedIntents, type PredefinedIntent } from '../../utils/intentParser';

interface SmartInputBarProps {
  onSend: (prompt: string) => void;
  disabled?: boolean;
}

export function SmartInputBar({ onSend, disabled }: SmartInputBarProps) {
  const [prompt, setPrompt] = useState('');
  const [showPalette, setShowPalette] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  const suggestions = getSuggestedIntents(prompt).slice(0, 3);

  const handleSend = () => {
    if (prompt.trim() && !disabled) {
      onSend(prompt.trim());
      setPrompt('');
      setShowSuggestions(false);
      Keyboard.dismiss();
    }
  };

  const handleSelectIntent = (intentPrompt: string) => {
    setPrompt(intentPrompt);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handlePaletteSelect = (intentPrompt: string) => {
    onSend(intentPrompt);
    setPrompt('');
  };

  const handleVoiceTranscript = (transcript: string) => {
    setPrompt(transcript);
    inputRef.current?.focus();
  };

  const handleTextChange = (text: string) => {
    setPrompt(text);
    setShowSuggestions(text.length > 0 && suggestions.length > 0);
  };

  const handleFocus = () => {
    if (prompt.length > 0 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow tap to register
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <>
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((intent) => (
              <TouchableOpacity
                key={intent.id}
                style={styles.suggestionItem}
                onPress={() => handleSelectIntent(intent.prompt)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionIcon}>{intent.icon}</Text>
                <Text style={styles.suggestionText} numberOfLines={1}>
                  {intent.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input Row */}
        <View style={styles.inputRow}>
          {/* Command Palette Button */}
          <TouchableOpacity
            style={styles.paletteButton}
            onPress={() => setShowPalette(true)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.paletteIcon}>⌘</Text>
          </TouchableOpacity>

          {/* Text Input */}
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={prompt}
            onChangeText={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Ask the agent..."
            placeholderTextColor="#777777"
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
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Command Palette Modal */}
      <CommandPalette
        visible={showPalette}
        onClose={() => setShowPalette(false)}
        onSelectIntent={handlePaletteSelect}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  suggestionIcon: {
    fontSize: 14,
  },
  suggestionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paletteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paletteIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#333333',
  },
  sendIcon: {
    color: '#000000',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
