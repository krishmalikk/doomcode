import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useAgentStore } from '../../store/agentStore';
import { useSessionStore } from '../../store/session';

interface ModelOption {
  id: string;
  name: string;
  description: string;
}

const CLAUDE_MODELS: ModelOption[] = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Fast and capable' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most powerful' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude Haiku 3.5', description: 'Fastest' },
];

const CODEX_MODELS: ModelOption[] = [
  { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Balanced quality and speed' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Faster, cost-efficient' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Lightweight, fast' },
];

const GEMINI_MODELS: ModelOption[] = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fast and responsive' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'High quality' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Speed optimized' },
];

export function AgentSettingsPanel() {
  const { activeAgentId, updateConfig, getActiveConfig } = useAgentStore();
  const { sendAgentControl, connected } = useSessionStore();

  const config = getActiveConfig();
  const modelOptions = useMemo(() => {
    switch (activeAgentId) {
      case 'codex':
        return CODEX_MODELS;
      case 'gemini':
        return GEMINI_MODELS;
      case 'claude':
      default:
        return CLAUDE_MODELS;
    }
  }, [activeAgentId]);

  const [customModel, setCustomModel] = useState('');

  useEffect(() => {
    const isPreset = modelOptions.some((model) => model.id === config.model);
    setCustomModel(isPreset ? '' : config.model ?? '');
  }, [config.model, modelOptions]);

  const handleModelChange = (model: string) => {
    updateConfig(activeAgentId, { model });
    if (connected) {
      sendAgentControl('configure', { model });
    }
  };

  const handleCustomModelSubmit = () => {
    const trimmed = customModel.trim();
    if (!trimmed) return;
    updateConfig(activeAgentId, { model: trimmed });
    if (connected) {
      sendAgentControl('configure', { model: trimmed });
    }
  };

  const handleTemperatureChange = (temperature: number) => {
    updateConfig(activeAgentId, { temperature: Math.round(temperature * 100) / 100 });
  };

  const handleTemperatureCommit = () => {
    if (connected) {
      sendAgentControl('configure', { temperature: config.temperature });
    }
  };

  const handlePermissionToggle = (
    key: keyof typeof config.toolPermissions,
    value: boolean
  ) => {
    const toolPermissions = {
      ...config.toolPermissions,
      [key]: value,
    };
    updateConfig(activeAgentId, { toolPermissions });
    if (connected) {
      sendAgentControl('configure', { toolPermissions });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Model Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Model</Text>
        <View style={styles.modelList}>
          {modelOptions.map((model) => (
            <TouchableOpacity
              key={model.id}
              style={[
                styles.modelOption,
                config.model === model.id && styles.modelOptionSelected,
              ]}
              onPress={() => handleModelChange(model.id)}
              activeOpacity={0.7}
            >
              <View style={styles.modelInfo}>
                <Text
                  style={[
                    styles.modelName,
                    config.model === model.id && styles.modelNameSelected,
                  ]}
                >
                  {model.name}
                </Text>
                <Text style={styles.modelDescription}>{model.description}</Text>
              </View>
              {config.model === model.id && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.customModelRow}>
          <TextInput
            style={styles.customModelInput}
            placeholder="Custom model ID..."
            placeholderTextColor="#666666"
            value={customModel}
            onChangeText={setCustomModel}
            onSubmitEditing={handleCustomModelSubmit}
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[
              styles.customModelButton,
              !customModel.trim() && styles.customModelButtonDisabled,
            ]}
            onPress={handleCustomModelSubmit}
            disabled={!customModel.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.customModelButtonText}>Use</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Temperature */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Temperature</Text>
          <Text style={styles.temperatureValue}>{config.temperature?.toFixed(2) ?? '0.70'}</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          step={0.01}
          value={config.temperature ?? 0.7}
          onValueChange={handleTemperatureChange}
          onSlidingComplete={handleTemperatureCommit}
          minimumTrackTintColor="#ffffff"
          maximumTrackTintColor="#333333"
          thumbTintColor="#ffffff"
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>Precise</Text>
          <Text style={styles.sliderLabel}>Creative</Text>
        </View>
      </View>

      {/* Tool Permissions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tool Permissions</Text>
        <View style={styles.permissionList}>
          <View style={styles.permissionItem}>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionName}>File Read</Text>
              <Text style={styles.permissionDescription}>Allow reading files</Text>
            </View>
            <Switch
              value={config.toolPermissions.allowFileRead}
              onValueChange={(v) => handlePermissionToggle('allowFileRead', v)}
              trackColor={{ false: '#333333', true: '#ffffff' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.permissionItem}>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionName}>File Write</Text>
              <Text style={styles.permissionDescription}>Allow creating/modifying files</Text>
            </View>
            <Switch
              value={config.toolPermissions.allowFileWrite}
              onValueChange={(v) => handlePermissionToggle('allowFileWrite', v)}
              trackColor={{ false: '#333333', true: '#ffffff' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.permissionItem}>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionName}>Shell Commands</Text>
              <Text style={styles.permissionDescription}>Allow running terminal commands</Text>
            </View>
            <Switch
              value={config.toolPermissions.allowShellCommands}
              onValueChange={(v) => handlePermissionToggle('allowShellCommands', v)}
              trackColor={{ false: '#333333', true: '#ffffff' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.permissionItem}>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionName}>Network Access</Text>
              <Text style={styles.permissionDescription}>Allow network requests</Text>
            </View>
            <Switch
              value={config.toolPermissions.allowNetworkAccess}
              onValueChange={(v) => handlePermissionToggle('allowNetworkAccess', v)}
              trackColor={{ false: '#333333', true: '#ffffff' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.permissionItem}>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionName}>Git Operations</Text>
              <Text style={styles.permissionDescription}>Allow git commands</Text>
            </View>
            <Switch
              value={config.toolPermissions.allowGitOperations}
              onValueChange={(v) => handlePermissionToggle('allowGitOperations', v)}
              trackColor={{ false: '#333333', true: '#ffffff' }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.permissionItem, styles.permissionItemHighlight]}>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionName}>Require Write Approval</Text>
              <Text style={styles.permissionDescription}>
                Always ask before applying file changes
              </Text>
            </View>
            <Switch
              value={config.toolPermissions.requireApprovalForWrites}
              onValueChange={(v) => handlePermissionToggle('requireApprovalForWrites', v)}
              trackColor={{ false: '#333333', true: '#ffffff' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modelList: {
    gap: 8,
  },
  customModelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  customModelInput: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
  },
  customModelButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  customModelButtonDisabled: {
    backgroundColor: '#333333',
  },
  customModelButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  modelOptionSelected: {
    borderColor: '#ffffff',
    backgroundColor: '#111111',
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modelNameSelected: {
    color: '#ffffff',
  },
  modelDescription: {
    color: '#aaaaaa',
    fontSize: 12,
    marginTop: 2,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  temperatureValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    color: '#aaaaaa',
    fontSize: 11,
  },
  permissionList: {
    gap: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    padding: 12,
    borderRadius: 8,
  },
  permissionItemHighlight: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  permissionInfo: {
    flex: 1,
  },
  permissionName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  permissionDescription: {
    color: '#aaaaaa',
    fontSize: 12,
    marginTop: 2,
  },
});
