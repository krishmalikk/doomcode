import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useMemo } from 'react';

interface Props {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

// Simple syntax highlighting keywords for common languages
const KEYWORDS: Record<string, string[]> = {
  typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'export', 'import', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'extends', 'implements'],
  javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'export', 'import', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'extends'],
  python: ['def', 'class', 'return', 'if', 'else', 'elif', 'for', 'while', 'import', 'from', 'try', 'except', 'raise', 'with', 'as', 'lambda', 'self', 'True', 'False', 'None', 'and', 'or', 'not', 'in'],
  rust: ['fn', 'let', 'mut', 'const', 'if', 'else', 'for', 'while', 'loop', 'match', 'struct', 'enum', 'impl', 'trait', 'pub', 'use', 'mod', 'return', 'self', 'Self', 'async', 'await'],
  go: ['func', 'var', 'const', 'if', 'else', 'for', 'range', 'switch', 'case', 'return', 'type', 'struct', 'interface', 'package', 'import', 'go', 'defer', 'chan', 'select'],
};

const LANGUAGE_ALIASES: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  rs: 'rust',
};

export function CodeBlock({
  code,
  language = 'typescript',
  filename,
  showLineNumbers = true,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  const normalizedLang = LANGUAGE_ALIASES[language] || language;
  const keywords = KEYWORDS[normalizedLang] || [];

  const lines = useMemo(() => code.split('\n'), [code]);

  const highlightLine = (line: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    // Simple tokenization
    const tokenRegex = /(\s+)|([a-zA-Z_][a-zA-Z0-9_]*)|("[^"]*"|'[^']*'|`[^`]*`)|(\/\/.*$)|(\/\*[\s\S]*?\*\/)|([0-9]+\.?[0-9]*)|(.)/g;

    let match;
    while ((match = tokenRegex.exec(line)) !== null) {
      const token = match[0];

      if (match[1]) {
        // Whitespace
        parts.push(<Text key={key++}>{token}</Text>);
      } else if (match[2]) {
        // Identifier
        if (keywords.includes(token)) {
          parts.push(
            <Text key={key++} style={styles.keyword}>
              {token}
            </Text>
          );
        } else {
          parts.push(<Text key={key++}>{token}</Text>);
        }
      } else if (match[3]) {
        // String
        parts.push(
          <Text key={key++} style={styles.string}>
            {token}
          </Text>
        );
      } else if (match[4] || match[5]) {
        // Comment
        parts.push(
          <Text key={key++} style={styles.comment}>
            {token}
          </Text>
        );
      } else if (match[6]) {
        // Number
        parts.push(
          <Text key={key++} style={styles.number}>
            {token}
          </Text>
        );
      } else {
        parts.push(<Text key={key++}>{token}</Text>);
      }
    }

    return parts;
  };

  return (
    <View style={styles.container}>
      {filename && (
        <TouchableOpacity
          style={styles.header}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.fileIcon}>📄</Text>
          <Text style={styles.filename}>{filename}</Text>
          <Text style={styles.language}>{language}</Text>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>
      )}

      {isExpanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.codeContainer}>
            {lines.map((line, index) => (
              <View key={index} style={styles.line}>
                {showLineNumbers && (
                  <Text style={styles.lineNumber}>{index + 1}</Text>
                )}
                <Text style={styles.code}>{highlightLine(line)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    backgroundColor: '#0d1117',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
    gap: 8,
  },
  fileIcon: {
    fontSize: 12,
  },
  filename: {
    color: '#e6edf3',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  language: {
    color: '#7d8590',
    fontSize: 11,
    backgroundColor: '#30363d',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expandIcon: {
    color: '#7d8590',
    fontSize: 10,
  },
  codeContainer: {
    padding: 12,
    minWidth: '100%',
  },
  line: {
    flexDirection: 'row',
    minHeight: 20,
  },
  lineNumber: {
    color: '#484f58',
    fontSize: 12,
    fontFamily: 'Menlo',
    width: 32,
    textAlign: 'right',
    marginRight: 16,
  },
  code: {
    color: '#e6edf3',
    fontSize: 13,
    fontFamily: 'Menlo',
    flex: 1,
  },
  keyword: {
    color: '#ff7b72',
  },
  string: {
    color: '#a5d6ff',
  },
  comment: {
    color: '#8b949e',
    fontStyle: 'italic',
  },
  number: {
    color: '#79c0ff',
  },
});
