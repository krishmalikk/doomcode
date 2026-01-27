import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import type { DiffPatchMessage } from '@doomcode/protocol';
import { DiffSummaryCard } from './diff/DiffSummaryCard';

interface Props {
  diff: DiffPatchMessage;
  onApprove: () => void;
  onReject: () => void;
}

export function DiffViewer({ diff, onApprove, onReject }: Props) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <View style={styles.container}>
      {/* Summary Card */}
      <DiffSummaryCard diff={diff} />

      {/* Toggle Details */}
      <TouchableOpacity
        style={styles.toggleDetails}
        onPress={() => setShowDetails(!showDetails)}
        activeOpacity={0.7}
      >
        <Text style={styles.toggleText}>
          {showDetails ? 'Hide file details' : 'Show file details'}
        </Text>
        <Text style={styles.toggleIcon}>{showDetails ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* File List (Collapsible) */}
      {showDetails && (
        <ScrollView style={styles.fileList} nestedScrollEnabled>
          {diff.files.map((file, index) => (
            <View key={index} style={styles.file}>
              <View style={styles.fileHeader}>
                <StatusBadge status={file.status} />
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.path}
                </Text>
              </View>
              <ScrollView horizontal style={styles.diffContent}>
                <Text style={styles.diffText}>{file.diff}</Text>
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={onReject}>
          <Text style={styles.buttonText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.approveButton]} onPress={onApprove}>
          <Text style={styles.buttonText}>Apply Changes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getStyle = () => {
    switch (status) {
      case 'added':
        return styles.statusAdded;
      case 'deleted':
        return styles.statusDeleted;
      case 'renamed':
        return styles.statusRenamed;
      default:
        return styles.statusModified;
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'added':
        return 'A';
      case 'deleted':
        return 'D';
      case 'renamed':
        return 'R';
      default:
        return 'M';
    }
  };

  return (
    <View style={[styles.statusBadge, getStyle()]}>
      <Text style={styles.statusText}>{getLabel()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  toggleDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#111111',
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  toggleText: {
    color: '#aaaaaa',
    fontSize: 13,
  },
  toggleIcon: {
    color: '#aaaaaa',
    fontSize: 10,
  },
  fileListContainer: {
    backgroundColor: '#111111',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  fileList: {
    maxHeight: 300,
  },
  file: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#000000',
  },
  statusBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  statusAdded: {
    backgroundColor: '#ffffff',
  },
  statusDeleted: {
    backgroundColor: '#ffffff',
  },
  statusModified: {
    backgroundColor: '#ffffff',
  },
  statusRenamed: {
    backgroundColor: '#ffffff',
  },
  statusText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fileName: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'monospace',
    flex: 1,
  },
  diffContent: {
    backgroundColor: '#000000',
    padding: 12,
    maxHeight: 200,
  },
  diffText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#333333',
  },
  approveButton: {
    backgroundColor: '#ffffff',
  },
  buttonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
