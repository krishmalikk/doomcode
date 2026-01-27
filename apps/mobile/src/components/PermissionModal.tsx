import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import type { PermissionRequestMessage } from '@doomcode/protocol';

interface Props {
  permission: PermissionRequestMessage;
  onApprove: () => void;
  onDeny: () => void;
  onAlwaysApprove: () => void;
}

export function PermissionModal({ permission, onApprove, onDeny, onAlwaysApprove }: Props) {
  const getActionIcon = () => {
    switch (permission.action) {
      case 'file_read':
        return '📖';
      case 'file_write':
        return '✏️';
      case 'file_delete':
        return '🗑️';
      case 'shell_command':
        return '⚡';
      case 'network':
        return '🌐';
      case 'git':
        return '🔀';
      default:
        return '❓';
    }
  };

  return (
    <Modal transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.icon}>{getActionIcon()}</Text>
            <Text style={styles.title}>Permission Required</Text>
          </View>

          <Text style={styles.description}>{permission.description}</Text>

          {permission.details.path && (
            <View style={styles.detail}>
              <Text style={styles.detailLabel}>Path:</Text>
              <Text style={styles.detailValue}>{permission.details.path}</Text>
            </View>
          )}

          {permission.details.command && (
            <View style={styles.detail}>
              <Text style={styles.detailLabel}>Command:</Text>
              <Text style={styles.detailValue}>{permission.details.command}</Text>
            </View>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.button, styles.denyButton]} onPress={onDeny}>
              <Text style={styles.buttonText}>Deny</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.approveButton]} onPress={onApprove}>
              <Text style={styles.buttonText}>Allow</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.alwaysButton} onPress={onAlwaysApprove}>
            <Text style={styles.alwaysButtonText}>Always allow this action</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  description: {
    fontSize: 16,
    color: '#aaaaaa',
    marginBottom: 16,
  },
  detail: {
    backgroundColor: '#000000',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#aaaaaa',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  denyButton: {
    backgroundColor: '#333333',
  },
  approveButton: {
    backgroundColor: '#ffffff',
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  alwaysButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  alwaysButtonText: {
    color: '#aaaaaa',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
