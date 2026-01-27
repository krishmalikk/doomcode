import type { DiffFile } from './parse.js';

/**
 * Format diff statistics as a string.
 */
export function formatDiffStats(additions: number, deletions: number): string {
  const parts: string[] = [];

  if (additions > 0) {
    parts.push(`+${additions}`);
  }
  if (deletions > 0) {
    parts.push(`-${deletions}`);
  }

  return parts.join(' ') || '0';
}

/**
 * Get an icon/emoji for a file based on its extension.
 */
export function getFileIcon(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';

  const icons: Record<string, string> = {
    ts: 'TS',
    tsx: 'TSX',
    js: 'JS',
    jsx: 'JSX',
    json: 'JSON',
    md: 'MD',
    css: 'CSS',
    scss: 'SCSS',
    html: 'HTML',
    py: 'PY',
    rs: 'RS',
    go: 'GO',
    java: 'JAVA',
    c: 'C',
    cpp: 'C++',
    h: 'H',
    yml: 'YAML',
    yaml: 'YAML',
    toml: 'TOML',
    sql: 'SQL',
    sh: 'SH',
    bash: 'BASH',
    dockerfile: 'DOCKER',
    gitignore: 'GIT',
  };

  return icons[ext] || 'FILE';
}

/**
 * Get status badge for a file.
 */
export function getStatusBadge(file: DiffFile): { text: string; color: string } {
  switch (file.status) {
    case 'added':
      return { text: 'A', color: 'green' };
    case 'deleted':
      return { text: 'D', color: 'red' };
    case 'renamed':
      return { text: 'R', color: 'blue' };
    case 'modified':
    default:
      return { text: 'M', color: 'yellow' };
  }
}

/**
 * Get the filename from a path.
 */
export function getFilename(path: string): string {
  return path.split('/').pop() || path;
}

/**
 * Get the directory from a path.
 */
export function getDirectory(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '.';
}
