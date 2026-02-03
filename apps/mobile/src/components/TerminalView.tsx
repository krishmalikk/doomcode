import { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { TerminalOutputMessage } from '@doomcode/protocol';
import { useTerminalPrefsStore } from '../store/terminalPrefsStore';
import { TERMINAL_THEMES, type TerminalTheme } from '../constants/terminalThemes';

interface Props {
  output: TerminalOutputMessage[];
}

export function TerminalView({ output }: Props) {
  const webViewRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef('');
  const lastIndexRef = useRef(0);

  const { theme, fontSize } = useTerminalPrefsStore();
  const themeConfig = TERMINAL_THEMES[theme];

  const html = useMemo(() => buildTerminalHtml(themeConfig, fontSize), [themeConfig, fontSize]);

  useEffect(() => {
    if (output.length < lastIndexRef.current) {
      lastIndexRef.current = 0;
      pendingRef.current = '';
    }

    const startIndex = lastIndexRef.current;
    if (output.length <= startIndex) return;

    const chunk = output.slice(startIndex).map((msg) => msg.data).join('');
    lastIndexRef.current = output.length;

    if (!chunk) return;
    if (!readyRef.current) {
      pendingRef.current += chunk;
      return;
    }

    webViewRef.current?.postMessage(JSON.stringify({ type: 'output', data: chunk }));
  }, [output]);

  // Send theme/font updates to WebView
  useEffect(() => {
    if (!readyRef.current) return;
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: 'config',
        theme: {
          background: themeConfig.background,
          foreground: themeConfig.foreground,
          cursor: themeConfig.cursor,
          selection: themeConfig.selection,
        },
        fontSize,
      })
    );
  }, [themeConfig, fontSize]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(event) => {
          if (event.nativeEvent.data !== 'ready') return;
          readyRef.current = true;
          if (pendingRef.current) {
            webViewRef.current?.postMessage(
              JSON.stringify({ type: 'output', data: pendingRef.current })
            );
            pendingRef.current = '';
          }
        }}
      />
    </View>
  );
}

function buildTerminalHtml(theme: TerminalTheme, fontSize: number): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css"
    />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: ${theme.background};
        overflow: hidden;
      }
      #terminal {
        width: 100%;
        height: 100%;
      }
      .xterm-viewport {
        overflow-x: auto !important;
      }
      .xterm-viewport::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      .xterm-viewport::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
      }
      .xterm-viewport::-webkit-scrollbar-track {
        background: #1a1a1a;
      }
    </style>
  </head>
  <body>
    <div id="terminal"></div>
    <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js"></script>
    <script>
      const term = new Terminal({
        cursorBlink: true,
        fontSize: ${fontSize},
        fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
        theme: {
          background: '${theme.background}',
          foreground: '${theme.foreground}',
          cursor: '${theme.cursor}',
          selection: '${theme.selection}'
        },
        scrollback: 10000,
        allowTransparency: true,
        scrollOnUserInput: true,
        convertEol: true
      });
      const fitAddon = new FitAddon.FitAddon();
      term.loadAddon(fitAddon);
      term.open(document.getElementById('terminal'));

      // Multiple fit attempts to ensure proper sizing
      const doFit = () => {
        try {
          fitAddon.fit();
        } catch (e) {}
      };

      doFit();
      setTimeout(doFit, 50);
      setTimeout(doFit, 150);
      setTimeout(() => {
        doFit();
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ready');
      }, 300);

      // Re-fit on resize with debounce
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => fitAddon.fit(), 50);
      });

      const handleMessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'output') {
            term.write(msg.data);
          } else if (msg.type === 'config') {
            if (msg.theme) {
              term.options.theme = msg.theme;
              document.body.style.background = msg.theme.background;
            }
            if (msg.fontSize) {
              term.options.fontSize = msg.fontSize;
              fitAddon.fit();
            }
          } else if (msg.type === 'clear') {
            term.clear();
          }
        } catch (e) {
          console.error('Message parse error:', e);
        }
      };
      document.addEventListener('message', handleMessage);
      window.addEventListener('message', handleMessage);
    </script>
  </body>
</html>`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
