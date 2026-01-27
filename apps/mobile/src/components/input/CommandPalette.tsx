import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
} from 'react-native';
import {
  PREDEFINED_INTENTS,
  getSuggestedIntents,
  type PredefinedIntent,
} from '../../utils/intentParser';

interface CommandPaletteProps {
  visible: boolean;
  onClose: () => void;
  onSelectIntent: (prompt: string) => void;
}

export function CommandPalette({ visible, onClose, onSelectIntent }: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const suggestedIntents = getSuggestedIntents(searchQuery);

  const handleSelectIntent = (intent: PredefinedIntent) => {
    onSelectIntent(intent.prompt);
    setSearchQuery('');
    onClose();
  };

  const handleCustomSubmit = () => {
    if (searchQuery.trim()) {
      onSelectIntent(searchQuery.trim());
      setSearchQuery('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>Command Palette</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search commands or type custom..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleCustomSubmit}
              returnKeyType="send"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>

          <ScrollView style={styles.intentList} keyboardShouldPersistTaps="handled">
            {searchQuery.trim() && !suggestedIntents.length && (
              <TouchableOpacity
                style={styles.customIntent}
                onPress={handleCustomSubmit}
                activeOpacity={0.7}
              >
                <Text style={styles.customIcon}>💬</Text>
                <View style={styles.intentInfo}>
                  <Text style={styles.intentLabel}>Send custom prompt</Text>
                  <Text style={styles.intentDescription} numberOfLines={1}>
                    "{searchQuery}"
                  </Text>
                </View>
                <Text style={styles.arrowIcon}>→</Text>
              </TouchableOpacity>
            )}

            {suggestedIntents.map((intent) => (
              <TouchableOpacity
                key={intent.id}
                style={styles.intentItem}
                onPress={() => handleSelectIntent(intent)}
                activeOpacity={0.7}
              >
                <Text style={styles.intentIcon}>{intent.icon}</Text>
                <View style={styles.intentInfo}>
                  <Text style={styles.intentLabel}>{intent.label}</Text>
                  <Text style={styles.intentDescription}>{intent.description}</Text>
                </View>
                <Text style={styles.arrowIcon}>→</Text>
              </TouchableOpacity>
            ))}

            {!searchQuery && (
              <View style={styles.allIntentsSection}>
                <Text style={styles.sectionTitle}>All Commands</Text>
                {PREDEFINED_INTENTS.filter(
                  (i) => !suggestedIntents.find((s) => s.id === i.id)
                ).map((intent) => (
                  <TouchableOpacity
                    key={intent.id}
                    style={styles.intentItem}
                    onPress={() => handleSelectIntent(intent)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.intentIcon}>{intent.icon}</Text>
                    <View style={styles.intentInfo}>
                      <Text style={styles.intentLabel}>{intent.label}</Text>
                      <Text style={styles.intentDescription}>{intent.description}</Text>
                    </View>
                    <Text style={styles.arrowIcon}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    color: '#aaaaaa',
    fontSize: 20,
  },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  searchInput: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  intentList: {
    flex: 1,
    padding: 12,
  },
  intentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  customIntent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  intentIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  customIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  intentInfo: {
    flex: 1,
  },
  intentLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  intentDescription: {
    color: '#aaaaaa',
    fontSize: 13,
  },
  arrowIcon: {
    color: '#ffffff',
    fontSize: 18,
    marginLeft: 8,
  },
  allIntentsSection: {
    marginTop: 16,
  },
  sectionTitle: {
    color: '#aaaaaa',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
});
