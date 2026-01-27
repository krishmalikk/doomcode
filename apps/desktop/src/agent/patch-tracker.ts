/**
 * Patch Tracker
 *
 * Tracks applied patches for deterministic undo functionality.
 * Captures file state before/after patches and generates reverse diffs.
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import type {
  AppliedPatch,
  PatchedFile,
  DiffPatchMessage,
  AgentId,
} from '@doomcode/protocol';

export interface UndoResult {
  success: boolean;
  error?: string;
  revertedFiles: string[];
}

export class PatchTracker {
  private workingDirectory: string;
  private appliedPatches: AppliedPatch[] = [];
  private maxPatches = 50;

  constructor(workingDirectory: string) {
    this.workingDirectory = workingDirectory;
  }

  /**
   * Prepare for a patch by capturing the before-state of all affected files.
   * Returns a patchId to be used when finalizing.
   */
  async prepareForPatch(
    diff: DiffPatchMessage,
    prompt: string,
    agentId: AgentId
  ): Promise<string> {
    const patchId = randomUUID();
    const files: PatchedFile[] = [];

    for (const file of diff.files) {
      const filePath = path.join(this.workingDirectory, file.path);
      let beforeHash = '';
      let beforeContent = '';

      // Capture before state if file exists
      if (fs.existsSync(filePath)) {
        beforeContent = fs.readFileSync(filePath, 'utf8');
        beforeHash = this.hashContent(beforeContent);
      }

      files.push({
        path: file.path,
        beforeHash,
        afterHash: '', // Will be filled after apply
        reverseDiff: this.generateReverseDiff(file.diff),
      });
    }

    const patch: AppliedPatch = {
      patchId,
      timestamp: Date.now(),
      files,
      agentId,
      prompt,
    };

    // Add to front of list (newest first)
    this.appliedPatches.unshift(patch);

    // Trim to max size
    if (this.appliedPatches.length > this.maxPatches) {
      this.appliedPatches = this.appliedPatches.slice(0, this.maxPatches);
    }

    return patchId;
  }

  /**
   * Finalize patch record after application by capturing after-state hashes.
   */
  async finalizePatch(patchId: string): Promise<AppliedPatch | null> {
    const patch = this.appliedPatches.find((p) => p.patchId === patchId);
    if (!patch) return null;

    // Update after hashes
    for (const file of patch.files) {
      const filePath = path.join(this.workingDirectory, file.path);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        file.afterHash = this.hashContent(content);
      }
    }

    return patch;
  }

  /**
   * Undo a specific patch by applying its reverse diff.
   * Verifies file state before reverting to ensure determinism.
   */
  async undoPatch(patchId: string): Promise<UndoResult> {
    const patch = this.appliedPatches.find((p) => p.patchId === patchId);
    if (!patch) {
      return { success: false, error: 'Patch not found', revertedFiles: [] };
    }

    const revertedFiles: string[] = [];

    try {
      // Verify current state matches expected "after" state for all files
      for (const file of patch.files) {
        const filePath = path.join(this.workingDirectory, file.path);

        if (fs.existsSync(filePath)) {
          const currentHash = this.hashContent(fs.readFileSync(filePath, 'utf8'));
          if (file.afterHash && currentHash !== file.afterHash) {
            return {
              success: false,
              error: `File ${file.path} has been modified since patch was applied`,
              revertedFiles,
            };
          }
        } else if (file.afterHash) {
          // File was supposed to exist but doesn't
          return {
            success: false,
            error: `File ${file.path} no longer exists`,
            revertedFiles,
          };
        }
      }

      // Apply reverse diffs in reverse order (last file first)
      for (const file of [...patch.files].reverse()) {
        if (file.reverseDiff) {
          await this.applyReverseDiff(file.path, file.reverseDiff);
          revertedFiles.push(file.path);
        }
      }

      // Remove from history
      this.appliedPatches = this.appliedPatches.filter((p) => p.patchId !== patchId);

      return { success: true, revertedFiles };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during undo',
        revertedFiles,
      };
    }
  }

  /**
   * Get list of applied patches (for status queries).
   */
  getAppliedPatches(): AppliedPatch[] {
    return [...this.appliedPatches];
  }

  /**
   * Get a specific patch by ID.
   */
  getPatch(patchId: string): AppliedPatch | undefined {
    return this.appliedPatches.find((p) => p.patchId === patchId);
  }

  /**
   * Clear all patch history.
   */
  clearHistory(): void {
    this.appliedPatches = [];
  }

  /**
   * Hash file content for state verification.
   */
  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generate a reverse diff by swapping + and - lines.
   */
  private generateReverseDiff(diff: string): string {
    const lines = diff.split('\n');
    return lines
      .map((line) => {
        // Swap + and - lines (but not header lines like +++ or ---)
        if (line.startsWith('+') && !line.startsWith('+++')) {
          return '-' + line.slice(1);
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          return '+' + line.slice(1);
        }
        return line;
      })
      .join('\n');
  }

  /**
   * Apply a reverse diff using git apply.
   */
  private async applyReverseDiff(filePath: string, reverseDiff: string): Promise<void> {
    const tmpFile = path.join(
      require('os').tmpdir(),
      `doomcode-reverse-${Date.now()}-${randomUUID().slice(0, 8)}.patch`
    );

    try {
      // Write the reverse diff to a temp file
      fs.writeFileSync(tmpFile, reverseDiff, 'utf8');

      // Try to apply using git apply
      try {
        execSync(`git apply --check "${tmpFile}"`, {
          cwd: this.workingDirectory,
          stdio: 'pipe',
        });
        execSync(`git apply "${tmpFile}"`, {
          cwd: this.workingDirectory,
          stdio: 'pipe',
        });
      } catch (gitError) {
        // Git apply failed, try manual revert
        console.warn(`git apply failed for ${filePath}, attempting manual revert`);
        this.manualRevert(filePath, reverseDiff);
      }
    } finally {
      // Clean up temp file
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    }
  }

  /**
   * Fallback: manually revert a file by parsing the reverse diff.
   * This is a simplified implementation for basic cases.
   */
  private manualRevert(filePath: string, reverseDiff: string): void {
    const fullPath = path.join(this.workingDirectory, filePath);

    // For deleted files (reverse of add), just delete
    if (reverseDiff.includes('new file mode')) {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      return;
    }

    // For added files (reverse of delete), we'd need the original content
    // This is a limitation - we should store original content for deleted files
    if (reverseDiff.includes('deleted file mode')) {
      console.warn(`Cannot restore deleted file ${filePath} - original content not preserved`);
      return;
    }

    // For modified files, try line-by-line patch
    // This is a simplified implementation
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      const diffLines = reverseDiff.split('\n');

      // Parse diff hunks and apply changes
      // Note: This is a basic implementation and may not handle all edge cases
      let outputLines = [...lines];
      let lineOffset = 0;

      for (const diffLine of diffLines) {
        if (diffLine.startsWith('@@')) {
          // Parse hunk header: @@ -start,count +start,count @@
          const match = diffLine.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
          if (match) {
            lineOffset = parseInt(match[2], 10) - 1;
          }
        } else if (diffLine.startsWith('+') && !diffLine.startsWith('+++')) {
          // Add line
          const lineContent = diffLine.slice(1);
          outputLines.splice(lineOffset, 0, lineContent);
          lineOffset++;
        } else if (diffLine.startsWith('-') && !diffLine.startsWith('---')) {
          // Remove line
          if (outputLines[lineOffset] === diffLine.slice(1)) {
            outputLines.splice(lineOffset, 1);
          }
        } else if (!diffLine.startsWith('\\')) {
          // Context line
          lineOffset++;
        }
      }

      fs.writeFileSync(fullPath, outputLines.join('\n'), 'utf8');
    }
  }
}
