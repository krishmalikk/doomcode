import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { DiffPatchMessage } from '@doomcode/protocol';

interface DiffSummaryCardProps {
  diff: DiffPatchMessage;
}

export function DiffSummaryCard({ diff }: DiffSummaryCardProps) {
  const getRiskColor = () => {
    switch (diff.estimatedRisk) {
      case 'high':
      case 'medium':
      case 'low':
        return '#ffffff';
    }
  };

  const getRiskIcon = () => {
    switch (diff.estimatedRisk) {
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return '✓';
    }
  };

  const getChangeDescription = () => {
    const addedFiles = diff.files.filter((f) => f.status === 'added').length;
    const modifiedFiles = diff.files.filter((f) => f.status === 'modified').length;
    const deletedFiles = diff.files.filter((f) => f.status === 'deleted').length;

    const parts: string[] = [];
    if (addedFiles > 0) parts.push(`${addedFiles} added`);
    if (modifiedFiles > 0) parts.push(`${modifiedFiles} modified`);
    if (deletedFiles > 0) parts.push(`${deletedFiles} deleted`);

    return parts.join(', ') || 'No file changes';
  };

  return (
    <View style={styles.container}>
      {/* Summary Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>{getRiskIcon()}</Text>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Proposed Changes</Text>
          <View style={[styles.riskBadge, { backgroundColor: getRiskColor() }]}>
            <Text style={styles.riskText}>{diff.estimatedRisk}</Text>
          </View>
        </View>
      </View>

      {/* What Changed */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>What Changed</Text>
        <Text style={styles.sectionContent}>{diff.summary || 'Code modifications'}</Text>
      </View>

      {/* File Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{diff.files.length}</Text>
          <Text style={styles.statLabel}>Files</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, styles.additions]}>+{diff.totalAdditions}</Text>
          <Text style={styles.statLabel}>Lines added</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, styles.deletions]}>-{diff.totalDeletions}</Text>
          <Text style={styles.statLabel}>Lines removed</Text>
        </View>
      </View>

      {/* Change Breakdown */}
      <View style={styles.breakdown}>
        <Text style={styles.breakdownText}>{getChangeDescription()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333333',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  section: {
    padding: 14,
    paddingBottom: 10,
  },
  sectionLabel: {
    color: '#aaaaaa',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionContent: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#333333',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#aaaaaa',
    fontSize: 10,
    marginTop: 2,
  },
  additions: {
    color: '#ffffff',
  },
  deletions: {
    color: '#ffffff',
  },
  breakdown: {
    padding: 12,
    backgroundColor: '#000000',
  },
  breakdownText: {
    color: '#aaaaaa',
    fontSize: 12,
    textAlign: 'center',
  },
});
