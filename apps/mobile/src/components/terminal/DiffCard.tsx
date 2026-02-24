import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';
import { parseDiff, type DiffFile, type DiffLine, formatDiffStats, getFileIcon } from '@doomcode/diff-parser';

interface Props {
  diff: string;
  onApply?: () => void;
  onReject?: () => void;
  patchId?: string;
}

const STATUS_COLORS: Record<string, string> = {
  added: '#4ade80',
  modified: '#fbbf24',
  deleted: '#ef4444',
  renamed: '#60a5fa',
};

const STATUS_LABELS: Record<string, string> = {
  added: 'New',
  modified: 'Modified',
  deleted: 'Deleted',
  renamed: 'Renamed',
};

export function DiffCard({ diff, onApply, onReject, patchId }: Props) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const parsed = parseDiff(diff);

  const toggleFile = (path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedFiles(new Set(parsed.files.map((f) => f.newPath)));
  };

  const collapseAll = () => {
    setExpandedFiles(new Set());
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>📝</Text>
          <Text style={styles.headerTitle}>Proposed Changes</Text>
        </View>
        <View style={styles.stats}>
          <Text style={styles.additions}>+{parsed.totalAdditions}</Text>
          <Text style={styles.deletions}>-{parsed.totalDeletions}</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity onPress={expandAll} style={styles.toolButton}>
          <Text style={styles.toolText}>Expand all</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={collapseAll} style={styles.toolButton}>
          <Text style={styles.toolText}>Collapse all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.fileList} nestedScrollEnabled>
        {parsed.files.map((file) => (
          <FileEntry
            key={file.newPath}
            file={file}
            isExpanded={expandedFiles.has(file.newPath)}
            onToggle={() => toggleFile(file.newPath)}
          />
        ))}
      </ScrollView>

      {(onApply || onReject) && (
        <View style={styles.actions}>
          {onReject && (
            <TouchableOpacity style={styles.rejectButton} onPress={onReject}>
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>
          )}
          {onApply && (
            <TouchableOpacity style={styles.applyButton} onPress={onApply}>
              <Text style={styles.applyText}>Apply Changes</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

interface FileEntryProps {
  file: DiffFile;
  isExpanded: boolean;
  onToggle: () => void;
}

function FileEntry({ file, isExpanded, onToggle }: FileEntryProps) {
  const statusColor = STATUS_COLORS[file.status] || '#888888';
  const statusLabel = STATUS_LABELS[file.status] || file.status;
  const icon = getFileIcon(file.newPath);

  return (
    <View style={styles.fileEntry}>
      <TouchableOpacity style={styles.fileHeader} onPress={onToggle} activeOpacity={0.7}>
        <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        <Text style={styles.fileIcon}>{icon}</Text>
        <Text style={styles.fileName} numberOfLines={1}>
          {file.newPath}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <Text style={styles.fileStats}>
          <Text style={styles.additions}>+{file.additions}</Text>
          {' '}
          <Text style={styles.deletions}>-{file.deletions}</Text>
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.diffContent}>
            {file.hunks.map((hunk, hunkIndex) => (
              <View key={hunkIndex} style={styles.hunk}>
                <Text style={styles.hunkHeader}>{hunk.header}</Text>
                {hunk.lines.map((line, lineIndex) => (
                  <DiffLineView key={lineIndex} line={line} />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

interface DiffLineViewProps {
  line: DiffLine;
}

function DiffLineView({ line }: DiffLineViewProps) {
  const getLineStyle = () => {
    switch (line.type) {
      case 'addition':
        return styles.additionLine;
      case 'deletion':
        return styles.deletionLine;
      case 'header':
        return styles.headerLine;
      default:
        return styles.contextLine;
    }
  };

  const getLineNumber = () => {
    if (line.type === 'header') return '';
    if (line.type === 'addition') return line.newLineNumber || '';
    if (line.type === 'deletion') return line.oldLineNumber || '';
    return line.newLineNumber || '';
  };

  const getPrefix = () => {
    switch (line.type) {
      case 'addition':
        return '+';
      case 'deletion':
        return '-';
      case 'header':
        return '';
      default:
        return ' ';
    }
  };

  if (line.type === 'header') {
    return null; // Skip header lines as they're shown separately
  }

  return (
    <View style={[styles.diffLine, getLineStyle()]}>
      <Text style={styles.lineNumber}>{getLineNumber()}</Text>
      <Text style={styles.linePrefix}>{getPrefix()}</Text>
      <Text style={styles.lineContent}>{line.content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 12,
    backgroundColor: '#161b22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363d',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#1a1f26',
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 16,
  },
  headerTitle: {
    color: '#e6edf3',
    fontSize: 15,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  additions: {
    color: '#4ade80',
    fontSize: 13,
    fontWeight: '600',
  },
  deletions: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
  },
  toolButton: {
    paddingVertical: 4,
  },
  toolText: {
    color: '#58a6ff',
    fontSize: 13,
  },
  fileList: {
    maxHeight: 400,
  },
  fileEntry: {
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  expandIcon: {
    color: '#7d8590',
    fontSize: 10,
    width: 16,
  },
  fileIcon: {
    fontSize: 14,
  },
  fileName: {
    color: '#e6edf3',
    fontSize: 13,
    flex: 1,
    fontFamily: 'Menlo',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fileStats: {
    fontSize: 12,
  },
  diffContent: {
    backgroundColor: '#0d1117',
    paddingVertical: 4,
    minWidth: '100%',
  },
  hunk: {
    marginBottom: 8,
  },
  hunkHeader: {
    color: '#7d8590',
    fontSize: 12,
    fontFamily: 'Menlo',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#161b22',
  },
  diffLine: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    minHeight: 20,
  },
  contextLine: {
    backgroundColor: '#0d1117',
  },
  additionLine: {
    backgroundColor: 'rgba(63, 185, 80, 0.15)',
  },
  deletionLine: {
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
  },
  headerLine: {
    backgroundColor: 'rgba(56, 139, 253, 0.15)',
  },
  lineNumber: {
    color: '#484f58',
    fontSize: 12,
    fontFamily: 'Menlo',
    width: 40,
    textAlign: 'right',
    paddingRight: 8,
  },
  linePrefix: {
    color: '#7d8590',
    fontSize: 12,
    fontFamily: 'Menlo',
    width: 16,
    textAlign: 'center',
  },
  lineContent: {
    color: '#e6edf3',
    fontSize: 12,
    fontFamily: 'Menlo',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#30363d',
  },
  rejectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f85149',
  },
  rejectText: {
    color: '#f85149',
    fontSize: 14,
    fontWeight: '500',
  },
  applyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#238636',
  },
  applyText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});
