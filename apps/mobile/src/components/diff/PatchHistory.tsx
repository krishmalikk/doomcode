import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { AppliedPatch } from '@doomcode/protocol';
import { usePatchHistoryStore } from '../../store/patchHistoryStore';
import { useSessionStore } from '../../store/session';

export function PatchHistory() {
  const { patches, pendingUndo, lastUndoResult, clearLastUndoResult } = usePatchHistoryStore();
  const { sendUndoRequest, connected } = useSessionStore();

  if (patches.length === 0) {
    return null;
  }

  const handleUndo = (patchId: string) => {
    if (connected && !pendingUndo) {
      sendUndoRequest(patchId);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Applied Patches</Text>
        <Text style={styles.subtitle}>{patches.length} patches can be undone</Text>
      </View>

      {/* Undo Result Feedback */}
      {lastUndoResult && (
        <TouchableOpacity
          style={[
            styles.resultBanner,
            lastUndoResult.success ? styles.resultSuccess : styles.resultError,
          ]}
          onPress={clearLastUndoResult}
          activeOpacity={0.8}
        >
          <Text style={styles.resultText}>
            {lastUndoResult.success
              ? `Reverted ${lastUndoResult.revertedFiles.length} file(s)`
              : lastUndoResult.error || 'Undo failed'}
          </Text>
          <Text style={styles.resultDismiss}>Tap to dismiss</Text>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.list} nestedScrollEnabled>
        {patches.map((patch, index) => (
          <PatchItem
            key={patch.patchId}
            patch={patch}
            isLatest={index === 0}
            isPending={pendingUndo === patch.patchId}
            onUndo={() => handleUndo(patch.patchId)}
            formatTime={formatTime}
            canUndo={connected && !pendingUndo}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface PatchItemProps {
  patch: AppliedPatch;
  isLatest: boolean;
  isPending: boolean;
  onUndo: () => void;
  formatTime: (ts: number) => string;
  canUndo: boolean;
}

function PatchItem({ patch, isLatest, isPending, onUndo, formatTime, canUndo }: PatchItemProps) {
  const truncatePrompt = (prompt: string, maxLen: number = 50) => {
    if (prompt.length <= maxLen) return prompt;
    return prompt.substring(0, maxLen) + '...';
  };

  return (
    <View style={[styles.patchItem, isLatest && styles.patchItemLatest]}>
      <View style={styles.patchInfo}>
        <View style={styles.patchHeader}>
          <Text style={styles.patchTime}>{formatTime(patch.timestamp)}</Text>
          {isLatest && <Text style={styles.latestBadge}>Latest</Text>}
        </View>
        <Text style={styles.patchPrompt} numberOfLines={2}>
          {truncatePrompt(patch.prompt) || 'No prompt recorded'}
        </Text>
        <Text style={styles.patchFiles}>
          {patch.files.length} file{patch.files.length !== 1 ? 's' : ''} changed
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.undoButton,
          isPending && styles.undoButtonPending,
          !canUndo && styles.undoButtonDisabled,
        ]}
        onPress={onUndo}
        disabled={!canUndo || isPending}
        activeOpacity={0.7}
      >
        <Text style={styles.undoButtonText}>{isPending ? '...' : '↩'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    borderRadius: 12,
    marginTop: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333333',
  },
  header: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    backgroundColor: '#000000',
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#aaaaaa',
    fontSize: 12,
    marginTop: 2,
  },
  resultBanner: {
    padding: 12,
    alignItems: 'center',
  },
  resultSuccess: {
    backgroundColor: '#111111',
  },
  resultError: {
    backgroundColor: '#111111',
  },
  resultText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  resultDismiss: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  list: {
    maxHeight: 250,
  },
  patchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  patchItemLatest: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  patchInfo: {
    flex: 1,
  },
  patchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  patchTime: {
    color: '#aaaaaa',
    fontSize: 11,
  },
  latestBadge: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  patchPrompt: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
  },
  patchFiles: {
    color: '#aaaaaa',
    fontSize: 11,
    marginTop: 4,
  },
  undoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  undoButtonPending: {
    backgroundColor: '#111111',
  },
  undoButtonDisabled: {
    opacity: 0.5,
  },
  undoButtonText: {
    color: '#ffffff',
    fontSize: 18,
  },
});
