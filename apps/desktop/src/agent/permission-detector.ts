/**
 * Permission Detector
 *
 * Detects permission requests in agent output.
 */

import type { PermissionRequestMessage, PermissionAction } from '@doomcode/protocol';
import { randomUUID } from 'crypto';

interface DetectionPattern {
  regex: RegExp;
  action: PermissionAction;
  extractDetails: (match: RegExpMatchArray) => {
    description: string;
    details: Record<string, string | undefined>;
  };
}

const PATTERNS: DetectionPattern[] = [
  // Claude Code file read permission
  {
    regex: /Do you want to read (.+)\? \[y\/n\]/i,
    action: 'file_read',
    extractDetails: (match) => ({
      description: `Read file: ${match[1]}`,
      details: { path: match[1] },
    }),
  },
  // Claude Code file write permission
  {
    regex: /Do you want to write to (.+)\? \[y\/n\]/i,
    action: 'file_write',
    extractDetails: (match) => ({
      description: `Write to file: ${match[1]}`,
      details: { path: match[1] },
    }),
  },
  // Claude Code shell command permission
  {
    regex: /Do you want to run: (.+)\? \[y\/n\]/i,
    action: 'shell_command',
    extractDetails: (match) => ({
      description: `Run command: ${match[1]}`,
      details: { command: match[1] },
    }),
  },
  // Generic permission request
  {
    regex: /Allow (.+?) access\? \(yes\/no\)/i,
    action: 'other',
    extractDetails: (match) => ({
      description: match[1],
      details: {},
    }),
  },
  // Permission required prompt
  {
    regex: /Permission required: (.+)/i,
    action: 'other',
    extractDetails: (match) => ({
      description: match[1],
      details: {},
    }),
  },
  // Y/N confirmation (generic)
  {
    regex: /Do you want to (.*?)\? \[y\/n\]/i,
    action: 'other',
    extractDetails: (match) => ({
      description: match[1],
      details: {},
    }),
  },
];

export class PermissionDetector {
  detect(output: string): PermissionRequestMessage | null {
    // Check against each pattern
    for (const pattern of PATTERNS) {
      const match = output.match(pattern.regex);
      if (match) {
        const { description, details } = pattern.extractDetails(match);

        return {
          type: 'permission_request',
          requestId: randomUUID(),
          action: pattern.action,
          description,
          details,
          timeout: 60000, // 1 minute timeout
        };
      }
    }

    return null;
  }
}
