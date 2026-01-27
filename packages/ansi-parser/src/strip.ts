/**
 * Strip ANSI escape codes from text.
 */

// Matches all ANSI escape sequences
const ANSI_REGEX = /\x1b\[[0-9;]*m/g;

/**
 * Remove all ANSI escape sequences from a string.
 */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, '');
}
