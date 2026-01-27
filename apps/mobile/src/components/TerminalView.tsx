import { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { TerminalOutputMessage } from '@doomcode/protocol';

interface Props {
  output: TerminalOutputMessage[];
}

export function TerminalView({ output }: Props) {
  const webViewRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef('');
  const lastIndexRef = useRef(0);

  const html = useMemo(() => buildTerminalHtml(), []);

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

function buildTerminalHtml(): string {
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
      href="https://unpkg.com/xterm/css/xterm.css"
    />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: #0d1117;
      }
      #terminal {
        width: 100%;
        height: 100%;
      }
    </style>
  </head>
  <body>
    <div id="terminal"></div>
    <script src="https://unpkg.com/xterm/lib/xterm.js"></script>
    <script src="https://unpkg.com/xterm-addon-fit/lib/xterm-addon-fit.js"></script>
    <script>
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 12,
        fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
        theme: {
          background: '#0d1117',
          foreground: '#e6edf3',
          cursor: '#ffffff',
          selection: '#264f78'
        },
        scrollback: 5000,
        convertEol: false
      });
      const fitAddon = new FitAddon.FitAddon();
      term.loadAddon(fitAddon);
      term.open(document.getElementById('terminal'));
      fitAddon.fit();

      window.addEventListener('resize', () => fitAddon.fit());

      const handleMessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'output') {
            term.write(msg.data);
          }
        } catch (e) {}
      };
      document.addEventListener('message', handleMessage);
      window.addEventListener('message', handleMessage);
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ready');
    </script>
  </body>
</html>`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
});
