/**
 * ANSI escape code parser.
 * Converts ANSI-formatted terminal output into styled spans.
 */

import { SGR_COLORS, SGR_BG_COLORS, type ColorPalette } from './colors.js';

export type AnsiColor = keyof ColorPalette | null;

export interface AnsiStyle {
  color: AnsiColor;
  bgColor: AnsiColor;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  dim: boolean;
}

export interface AnsiSpan {
  text: string;
  style: AnsiStyle;
}

const DEFAULT_STYLE: AnsiStyle = {
  color: null,
  bgColor: null,
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  dim: false,
};

// Matches ANSI escape sequences: ESC[...m
const ANSI_REGEX = /\x1b\[([0-9;]*)m/g;

/**
 * Parse ANSI-formatted text into styled spans.
 */
export function parseAnsi(text: string): AnsiSpan[] {
  const spans: AnsiSpan[] = [];
  let currentStyle: AnsiStyle = { ...DEFAULT_STYLE };
  let lastIndex = 0;

  let match;
  while ((match = ANSI_REGEX.exec(text)) !== null) {
    // Add text before this escape sequence
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index);
      if (textContent) {
        spans.push({
          text: textContent,
          style: { ...currentStyle },
        });
      }
    }

    // Parse the SGR parameters
    const params = match[1] ? match[1].split(';').map((n) => parseInt(n, 10) || 0) : [0];
    currentStyle = applySGRParams(currentStyle, params);

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const textContent = text.slice(lastIndex);
    if (textContent) {
      spans.push({
        text: textContent,
        style: { ...currentStyle },
      });
    }
  }

  return spans;
}

/**
 * Apply SGR (Select Graphic Rendition) parameters to a style.
 */
function applySGRParams(style: AnsiStyle, params: number[]): AnsiStyle {
  const newStyle = { ...style };

  for (let i = 0; i < params.length; i++) {
    const code = params[i];

    switch (code) {
      case 0: // Reset
        return { ...DEFAULT_STYLE };

      case 1: // Bold
        newStyle.bold = true;
        break;

      case 2: // Dim
        newStyle.dim = true;
        break;

      case 3: // Italic
        newStyle.italic = true;
        break;

      case 4: // Underline
        newStyle.underline = true;
        break;

      case 9: // Strikethrough
        newStyle.strikethrough = true;
        break;

      case 22: // Normal intensity (not bold, not dim)
        newStyle.bold = false;
        newStyle.dim = false;
        break;

      case 23: // Not italic
        newStyle.italic = false;
        break;

      case 24: // Not underlined
        newStyle.underline = false;
        break;

      case 29: // Not strikethrough
        newStyle.strikethrough = false;
        break;

      case 39: // Default foreground color
        newStyle.color = null;
        break;

      case 49: // Default background color
        newStyle.bgColor = null;
        break;

      default:
        // Foreground colors (30-37, 90-97)
        if (code in SGR_COLORS) {
          newStyle.color = SGR_COLORS[code];
        }
        // Background colors (40-47, 100-107)
        else if (code in SGR_BG_COLORS) {
          newStyle.bgColor = SGR_BG_COLORS[code];
        }
        // Extended color (38;5;n or 48;5;n)
        else if (code === 38 && params[i + 1] === 5) {
          // 256-color mode - simplified to basic colors for now
          const colorIndex = params[i + 2];
          if (colorIndex !== undefined && colorIndex < 8) {
            const colorNames: (keyof ColorPalette)[] = [
              'black',
              'red',
              'green',
              'yellow',
              'blue',
              'magenta',
              'cyan',
              'white',
            ];
            newStyle.color = colorNames[colorIndex];
          } else if (colorIndex !== undefined && colorIndex < 16) {
            const colorNames: (keyof ColorPalette)[] = [
              'brightBlack',
              'brightRed',
              'brightGreen',
              'brightYellow',
              'brightBlue',
              'brightMagenta',
              'brightCyan',
              'brightWhite',
            ];
            newStyle.color = colorNames[colorIndex - 8];
          }
          i += 2; // Skip the next two parameters
        } else if (code === 48 && params[i + 1] === 5) {
          // 256-color background - simplified
          const colorIndex = params[i + 2];
          if (colorIndex !== undefined && colorIndex < 8) {
            const colorNames: (keyof ColorPalette)[] = [
              'black',
              'red',
              'green',
              'yellow',
              'blue',
              'magenta',
              'cyan',
              'white',
            ];
            newStyle.bgColor = colorNames[colorIndex];
          } else if (colorIndex !== undefined && colorIndex < 16) {
            const colorNames: (keyof ColorPalette)[] = [
              'brightBlack',
              'brightRed',
              'brightGreen',
              'brightYellow',
              'brightBlue',
              'brightMagenta',
              'brightCyan',
              'brightWhite',
            ];
            newStyle.bgColor = colorNames[colorIndex - 8];
          }
          i += 2;
        }
        break;
    }
  }

  return newStyle;
}
