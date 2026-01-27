import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useAgentStore } from '../../store/agentStore';
import { useSessionStore } from '../../store/session';

const CLAUDE_MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Fast and capable' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most powerful' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude Haiku 3.5', description: 'Fastest' },
];

export function AgentSettingsPanel() {
  const { activeAgentId, configs, updateConfig, getActiveConfig } = useAgentStore();
  const { sendAgentControl, connected } = useSessionStore();

  const config = getActiveConfig();
  const isClaude = activeAgentId === 'claude';

  const handleModelChange = (model: string) => {
    updateConfig(activeAgentId, { model });
    if (connected) {
      sendAgentControl('configure', { model });
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
        {isClaude ? (
          <View style={styles.modelList}>
            {CLAUDE_MODELS.map((model) => (
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
        ) : (
          <Text style={styles.modelDescription}>
            Model selection is available for Claude only.
          </Text>
        )}
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
