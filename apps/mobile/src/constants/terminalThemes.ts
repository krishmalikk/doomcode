export type ThemeId = 'default' | 'dracula' | 'monokai' | 'solarized' | 'nord' | 'onedark';

export interface TerminalTheme {
  id: ThemeId;
  name: string;
  background: string;
  foreground: string;
  cursor: string;
  selection: string;
}

export const TERMINAL_THEMES: Record<ThemeId, TerminalTheme> = {
  default: {
    id: 'default',
    name: 'Default Dark',
    background: '#000000',
    foreground: '#e6edf3',
    cursor: '#ffffff',
    selection: '#264f78',
  },
  dracula: {
    id: 'dracula',
    name: 'Dracula',
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    selection: '#44475a',
  },
  monokai: {
    id: 'monokai',
    name: 'Monokai',
    background: '#272822',
    foreground: '#f8f8f2',
    cursor: '#f8f8f0',
    selection: '#49483e',
  },
  solarized: {
    id: 'solarized',
    name: 'Solarized Dark',
    background: '#002b36',
    foreground: '#839496',
    cursor: '#93a1a1',
    selection: '#073642',
  },
  nord: {
    id: 'nord',
    name: 'Nord',
    background: '#2e3440',
    foreground: '#d8dee9',
    cursor: '#d8dee9',
    selection: '#434c5e',
  },
  onedark: {
    id: 'onedark',
    name: 'One Dark',
    background: '#282c34',
    foreground: '#abb2bf',
    cursor: '#528bff',
    selection: '#3e4451',
  },
};

export const THEME_LIST = Object.values(TERMINAL_THEMES);
