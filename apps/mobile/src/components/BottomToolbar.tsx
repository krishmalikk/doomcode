import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type ToolbarItem = 'agent' | 'commands' | 'history' | 'settings' | 'diffs' | 'help';

interface BottomToolbarProps {
  onAgentPress: () => void;
  onCommandsPress: () => void;
  onHistoryPress: () => void;
  onSettingsPress: () => void;
  onDiffsPress: () => void;
  onHelpPress: () => void;
  activeItem?: ToolbarItem | null;
  diffCount?: number;
  agentName?: string;
}

interface ToolbarButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  isActive: boolean;
  badge?: number;
}

function ToolbarButton({ icon, label, onPress, isActive, badge }: ToolbarButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, isActive && styles.buttonActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Text style={[styles.icon, isActive && styles.iconActive]}>{icon}</Text>
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function BottomToolbar({
  onAgentPress,
  onCommandsPress,
  onHistoryPress,
  onSettingsPress,
  onDiffsPress,
  onHelpPress,
  activeItem,
  diffCount,
  agentName = 'Agent',
}: BottomToolbarProps) {
  return (
    <View style={styles.container}>
      <ToolbarButton
        icon="AI"
        label={agentName}
        onPress={onAgentPress}
        isActive={activeItem === 'agent'}
      />
      <ToolbarButton
        icon="{}"
        label="Commands"
        onPress={onCommandsPress}
        isActive={activeItem === 'commands'}
      />
      <ToolbarButton
        icon="H"
        label="History"
        onPress={onHistoryPress}
        isActive={activeItem === 'history'}
      />
      <ToolbarButton
        icon="*"
        label="Settings"
        onPress={onSettingsPress}
        isActive={activeItem === 'settings'}
      />
      <ToolbarButton
        icon="D"
        label="Diffs"
        onPress={onDiffsPress}
        isActive={activeItem === 'diffs'}
        badge={diffCount}
      />
      <ToolbarButton
        icon="?"
        label="Help"
        onPress={onHelpPress}
        isActive={activeItem === 'help'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderTopWidth: 1,
    borderTopColor: '#222222',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  buttonActive: {
    backgroundColor: '#1a1a1a',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  icon: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
  },
  iconActive: {
    color: '#4ade80',
  },
  label: {
    fontSize: 10,
    color: '#666666',
    fontWeight: '500',
  },
  labelActive: {
    color: '#4ade80',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
