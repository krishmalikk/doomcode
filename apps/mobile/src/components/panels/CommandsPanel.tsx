import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { useAgentStore } from '../../store/agentStore';
import { getSuggestedIntents, INTENTS_BY_AGENT } from '../../utils/intentParser';

interface Props {
  onSelectCommand: (command: string) => void;
}

export function CommandsPanel({ onSelectCommand }: Props) {
  const [search, setSearch] = useState('');
  const { activeAgentId } = useAgentStore();

  const allIntents = INTENTS_BY_AGENT[activeAgentId] ?? [];
  const filteredIntents = search.trim()
    ? getSuggestedIntents(search, activeAgentId)
    : allIntents;

  const handleSelect = (prompt: string) => {
    onSelectCommand(prompt);
    setSearch('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search commands..."
          placeholderTextColor="#666666"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {search.trim() && filteredIntents.length === 0 && (
          <TouchableOpacity
            style={[styles.commandItem, styles.customCommand]}
            onPress={() => handleSelect(search.trim())}
          >
            <Text style={styles.commandIcon}>&gt;</Text>
            <View style={styles.commandContent}>
              <Text style={styles.commandLabel}>Send custom prompt</Text>
              <Text style={styles.commandDescription} numberOfLines={1}>
                "{search.trim()}"
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {filteredIntents.map((intent) => (
          <TouchableOpacity
            key={intent.id}
            style={styles.commandItem}
            onPress={() => handleSelect(intent.prompt)}
          >
            <Text style={styles.commandIcon}>{'{}'}</Text>
            <View style={styles.commandContent}>
              <Text style={styles.commandLabel}>{intent.label}</Text>
              <Text style={styles.commandDescription} numberOfLines={1}>
                {intent.description}
              </Text>
            </View>
            <Text style={styles.arrow}>&gt;</Text>
          </TouchableOpacity>
        ))}

        {filteredIntents.length === 0 && !search.trim() && (
          <Text style={styles.emptyText}>No commands available</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  commandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#222222',
  },
  customCommand: {
    borderColor: '#4ade80',
  },
  commandIcon: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
    fontFamily: 'monospace',
  },
  commandContent: {
    flex: 1,
  },
  commandLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  commandDescription: {
    color: '#888888',
    fontSize: 13,
    marginTop: 2,
  },
  arrow: {
    color: '#666666',
    fontSize: 16,
    marginLeft: 8,
  },
  emptyText: {
    color: '#666666',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
});
