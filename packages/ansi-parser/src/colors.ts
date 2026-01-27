/**
 * ANSI color definitions for terminal rendering.
 */

export interface ColorPalette {
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

/**
 * Default color palette (matches most terminal themes).
 */
export const ANSI_COLORS: ColorPalette = {
  black: '#1e1e1e',
  red: '#e74c3c',
  green: '#2ecc71',
  yellow: '#f1c40f',
  blue: '#3498db',
  magenta: '#9b59b6',
  cyan: '#1abc9c',
  white: '#ecf0f1',
  brightBlack: '#636e72',
  brightRed: '#ff6b6b',
  brightGreen: '#51cf66',
  brightYellow: '#ffd43b',
  brightBlue: '#339af0',
  brightMagenta: '#cc5de8',
  brightCyan: '#22b8cf',
  brightWhite: '#ffffff',
};

/**
 * Map SGR color codes to color names.
 */
export const SGR_COLORS: Record<number, keyof ColorPalette> = {
  30: 'black',
  31: 'red',
  32: 'green',
  33: 'yellow',
  34: 'blue',
  35: 'magenta',
  36: 'cyan',
  37: 'white',
  90: 'brightBlack',
  91: 'brightRed',
  92: 'brightGreen',
  93: 'brightYellow',
  94: 'brightBlue',
  95: 'brightMagenta',
  96: 'brightCyan',
  97: 'brightWhite',
};

export const SGR_BG_COLORS: Record<number, keyof ColorPalette> = {
  40: 'black',
  41: 'red',
  42: 'green',
  43: 'yellow',
  44: 'blue',
  45: 'magenta',
  46: 'cyan',
  47: 'white',
  100: 'brightBlack',
  101: 'brightRed',
  102: 'brightGreen',
  103: 'brightYellow',
  104: 'brightBlue',
  105: 'brightMagenta',
  106: 'brightCyan',
  107: 'brightWhite',
};
