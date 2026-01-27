/**
 * Diff Extractor
 *
 * Extracts git diffs from agent output.
 */

import type { DiffPatchMessage, FileDiff, RiskLevel } from '@doomcode/protocol';
import { parseDiff } from '@doomcode/diff-parser';
import { randomUUID } from 'crypto';

export class DiffExtractor {
  private diffBuffer = '';
  private inDiff = false;

  extract(output: string): DiffPatchMessage | null {
    // Look for diff start markers
    if (output.includes('diff --git') || output.includes('--- a/')) {
      this.inDiff = true;
    }

    if (this.inDiff) {
      this.diffBuffer += output;

      // Check for end of diff (typically followed by non-diff content or end of output)
      // This is a simplified heuristic - real implementation would need better detection
      if (this.isEndOfDiff(output)) {
        const diffText = this.diffBuffer;
        this.diffBuffer = '';
        this.inDiff = false;

        try {
          const parsed = parseDiff(diffText);

          if (parsed.files.length > 0) {
            const files: FileDiff[] = parsed.files.map((file) => ({
              path: file.newPath,
              diff: file.hunks.map((h) => h.header + '\n' + h.lines.map((l) => {
                const prefix = l.type === 'addition' ? '+' : l.type === 'deletion' ? '-' : ' ';
                return prefix + l.content;
              }).join('\n')).join('\n'),
              status: file.status,
              oldPath: file.oldPath !== file.newPath ? file.oldPath : undefined,
              additions: file.additions,
              deletions: file.deletions,
            }));

            return {
              type: 'diff_patch',
              patchId: randomUUID(),
              files,
              summary: this.generateSummary(parsed.files),
              estimatedRisk: this.estimateRisk(parsed.files),
              totalAdditions: parsed.totalAdditions,
              totalDeletions: parsed.totalDeletions,
            };
          }
        } catch {
          // Failed to parse diff
          return null;
        }
      }
    }

    return null;
  }

  private isEndOfDiff(output: string): boolean {
    // Heuristics for detecting end of diff:
    // 1. Multiple empty lines
    // 2. Non-diff content (prompt, message, etc.)
    // 3. Common terminal prompts

    const trimmed = output.trim();

    // Check for common end patterns
    if (trimmed.endsWith('$') || trimmed.endsWith('>') || trimmed.endsWith('#')) {
      return true;
    }

    // Check for multiple newlines at end
    if (output.endsWith('\n\n\n')) {
      return true;
    }

    // Check for certain keywords that indicate end of diff
    const endPatterns = [
      /Do you want to apply/i,
      /Apply these changes\?/i,
      /\d+ files? changed/i,
      /Successfully applied/i,
    ];

    for (const pattern of endPatterns) {
      if (pattern.test(output)) {
        return true;
      }
    }

    return false;
  }

  private generateSummary(files: Array<{ status: string; newPath: string }>): string {
    const added = files.filter((f) => f.status === 'added').length;
    const modified = files.filter((f) => f.status === 'modified').length;
    const deleted = files.filter((f) => f.status === 'deleted').length;

    const parts: string[] = [];
    if (added > 0) parts.push(`${added} added`);
    if (modified > 0) parts.push(`${modified} modified`);
    if (deleted > 0) parts.push(`${deleted} deleted`);

    return parts.join(', ') || 'No changes';
  }

  private estimateRisk(files: Array<{ newPath: string; additions: number; deletions: number }>): RiskLevel {
    // Simple risk estimation based on:
    // 1. Number of files changed
    // 2. Types of files changed
    // 3. Amount of changes

    const riskFactors = {
      fileCount: files.length,
      sensitiveFiles: files.filter((f) =>
        /\.(env|config|secret|key|password|auth)/i.test(f.newPath) ||
        /package\.json|tsconfig\.json|webpack|vite\.config/i.test(f.newPath)
      ).length,
      totalChanges: files.reduce((sum, f) => sum + f.additions + f.deletions, 0),
    };

    // High risk if touching sensitive files
    if (riskFactors.sensitiveFiles > 0) {
      return 'high';
    }

    // High risk if many files or large changes
    if (riskFactors.fileCount > 10 || riskFactors.totalChanges > 500) {
      return 'high';
    }

    // Medium risk if moderate changes
    if (riskFactors.fileCount > 5 || riskFactors.totalChanges > 100) {
      return 'medium';
    }

    return 'low';
  }
}
