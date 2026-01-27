/**
 * Parser for Git unified diff format.
 */

export type LineType = 'context' | 'addition' | 'deletion' | 'header';

export interface DiffLine {
  type: LineType;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed';

export interface DiffFile {
  oldPath: string;
  newPath: string;
  status: FileStatus;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  isBinary: boolean;
}

export interface ParsedDiff {
  files: DiffFile[];
  totalAdditions: number;
  totalDeletions: number;
}

const FILE_HEADER_REGEX = /^diff --git a\/(.+) b\/(.+)$/;
const OLD_FILE_REGEX = /^--- (.+)$/;
const NEW_FILE_REGEX = /^\+\+\+ (.+)$/;
const HUNK_HEADER_REGEX = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;
const BINARY_FILE_REGEX = /^Binary files/;
const NEW_FILE_MODE_REGEX = /^new file mode/;
const DELETED_FILE_MODE_REGEX = /^deleted file mode/;
const RENAME_FROM_REGEX = /^rename from (.+)$/;
const RENAME_TO_REGEX = /^rename to (.+)$/;

export function parseDiff(diffText: string): ParsedDiff {
  const lines = diffText.split('\n');
  const files: DiffFile[] = [];

  let currentFile: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLineNumber = 0;
  let newLineNumber = 0;
  let isNewFile = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // New file diff header
    const fileHeaderMatch = line.match(FILE_HEADER_REGEX);
    if (fileHeaderMatch) {
      // Save previous file
      if (currentFile) {
        if (currentHunk) {
          currentFile.hunks.push(currentHunk);
        }
        files.push(currentFile);
      }

      currentFile = {
        oldPath: fileHeaderMatch[1],
        newPath: fileHeaderMatch[2],
        status: 'modified',
        hunks: [],
        additions: 0,
        deletions: 0,
        isBinary: false,
      };
      currentHunk = null;
      isNewFile = false;
      continue;
    }

    if (!currentFile) continue;

    // Check for new/deleted file mode
    if (NEW_FILE_MODE_REGEX.test(line)) {
      isNewFile = true;
      currentFile.status = 'added';
      continue;
    }

    if (DELETED_FILE_MODE_REGEX.test(line)) {
      currentFile.status = 'deleted';
      continue;
    }

    // Check for rename
    const renameFromMatch = line.match(RENAME_FROM_REGEX);
    if (renameFromMatch) {
      currentFile.status = 'renamed';
      currentFile.oldPath = renameFromMatch[1];
      continue;
    }

    const renameToMatch = line.match(RENAME_TO_REGEX);
    if (renameToMatch) {
      currentFile.newPath = renameToMatch[1];
      continue;
    }

    // Binary file
    if (BINARY_FILE_REGEX.test(line)) {
      currentFile.isBinary = true;
      continue;
    }

    // Old file path (--- a/file)
    const oldFileMatch = line.match(OLD_FILE_REGEX);
    if (oldFileMatch) {
      const path = oldFileMatch[1];
      if (path !== '/dev/null') {
        currentFile.oldPath = path.replace(/^a\//, '');
      }
      continue;
    }

    // New file path (+++ b/file)
    const newFileMatch = line.match(NEW_FILE_REGEX);
    if (newFileMatch) {
      const path = newFileMatch[1];
      if (path === '/dev/null') {
        currentFile.status = 'deleted';
      } else {
        currentFile.newPath = path.replace(/^b\//, '');
        if (isNewFile) {
          currentFile.status = 'added';
        }
      }
      continue;
    }

    // Hunk header
    const hunkMatch = line.match(HUNK_HEADER_REGEX);
    if (hunkMatch) {
      if (currentHunk) {
        currentFile.hunks.push(currentHunk);
      }

      oldLineNumber = parseInt(hunkMatch[1], 10);
      newLineNumber = parseInt(hunkMatch[3], 10);

      currentHunk = {
        header: line,
        oldStart: oldLineNumber,
        oldLines: parseInt(hunkMatch[2] || '1', 10),
        newStart: newLineNumber,
        newLines: parseInt(hunkMatch[4] || '1', 10),
        lines: [],
      };

      // Add the header line
      currentHunk.lines.push({
        type: 'header',
        content: hunkMatch[5] || '',
      });

      continue;
    }

    // Diff content lines
    if (currentHunk) {
      if (line.startsWith('+')) {
        currentHunk.lines.push({
          type: 'addition',
          content: line.slice(1),
          newLineNumber: newLineNumber++,
        });
        currentFile.additions++;
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({
          type: 'deletion',
          content: line.slice(1),
          oldLineNumber: oldLineNumber++,
        });
        currentFile.deletions++;
      } else if (line.startsWith(' ') || line === '') {
        currentHunk.lines.push({
          type: 'context',
          content: line.slice(1),
          oldLineNumber: oldLineNumber++,
          newLineNumber: newLineNumber++,
        });
      }
    }
  }

  // Save last file
  if (currentFile) {
    if (currentHunk) {
      currentFile.hunks.push(currentHunk);
    }
    files.push(currentFile);
  }

  // Calculate totals
  const totalAdditions = files.reduce((sum, file) => sum + file.additions, 0);
  const totalDeletions = files.reduce((sum, file) => sum + file.deletions, 0);

  return {
    files,
    totalAdditions,
    totalDeletions,
  };
}
