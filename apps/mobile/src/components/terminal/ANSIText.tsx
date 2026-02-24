import { Text, StyleSheet, type TextStyle } from 'react-native';
import { useMemo } from 'react';
import { parseAnsi, ANSI_COLORS, type AnsiSpan, type AnsiStyle } from '@doomcode/ansi-parser';

interface Props {
  text: string;
  style?: TextStyle;
  selectable?: boolean;
}

/**
 * Converts ANSI style to React Native TextStyle
 */
function ansiStyleToTextStyle(ansiStyle: AnsiStyle): TextStyle {
  const style: TextStyle = {};

  // Foreground color
  if (ansiStyle.color) {
    style.color = ANSI_COLORS[ansiStyle.color];
  }

  // Background color
  if (ansiStyle.bgColor) {
    style.backgroundColor = ANSI_COLORS[ansiStyle.bgColor];
  }

  // Bold
  if (ansiStyle.bold) {
    style.fontWeight = 'bold';
  }

  // Dim (reduce opacity)
  if (ansiStyle.dim) {
    style.opacity = 0.6;
  }

  // Italic
  if (ansiStyle.italic) {
    style.fontStyle = 'italic';
  }

  // Underline
  if (ansiStyle.underline) {
    style.textDecorationLine = 'underline';
  }

  // Strikethrough
  if (ansiStyle.strikethrough) {
    style.textDecorationLine = ansiStyle.underline
      ? 'underline line-through'
      : 'line-through';
  }

  return style;
}

/**
 * Renders text with ANSI escape codes as styled React Native Text components.
 */
export function ANSIText({ text, style, selectable = true }: Props) {
  const spans = useMemo(() => parseAnsi(text), [text]);

  // If no ANSI codes, render plain text
  if (spans.length === 1 && !hasAnyStyle(spans[0].style)) {
    return (
      <Text style={[styles.text, style]} selectable={selectable}>
        {spans[0].text}
      </Text>
    );
  }

  return (
    <Text style={[styles.text, style]} selectable={selectable}>
      {spans.map((span, index) => (
        <Text key={index} style={ansiStyleToTextStyle(span.style)}>
          {span.text}
        </Text>
      ))}
    </Text>
  );
}

/**
 * Check if an ANSI style has any non-default values
 */
function hasAnyStyle(style: AnsiStyle): boolean {
  return !!(
    style.color ||
    style.bgColor ||
    style.bold ||
    style.italic ||
    style.underline ||
    style.strikethrough ||
    style.dim
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: 'Menlo',
    fontSize: 13,
    color: '#e6edf3',
    lineHeight: 18,
  },
});
