import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { DiffPatchMessage } from '@doomcode/protocol';
import { DiffViewer } from '../DiffViewer';
import { PatchHistory } from '../diff/PatchHistory';

interface Props {
  pendingDiffs: DiffPatchMessage[];
  onApprove: (patchId: string) => void;
  onReject: (patchId: string) => void;
}

export function DiffsPanel({ pendingDiffs, onApprove, onReject }: Props) {
  return (
    <ScrollView style={styles.container}>
      {pendingDiffs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>D</Text>
          <Text style={styles.emptyTitle}>No Pending Diffs</Text>
          <Text style={styles.emptyText}>
            When the AI agent makes file changes, they'll appear here for your review.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Pending Changes ({pendingDiffs.length})</Text>
          {pendingDiffs.map((diff) => (
            <DiffViewer
              key={diff.patchId}
              diff={diff}
              onApprove={() => onApprove(diff.patchId)}
              onReject={() => onReject(diff.patchId)}
            />
          ))}
        </>
      )}

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Applied Patches</Text>
        <PatchHistory />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historySection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#222222',
  },
});
