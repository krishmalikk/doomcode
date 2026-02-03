import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useTerminalPrefsStore } from '../../store/terminalPrefsStore';
import { THEME_LIST, type ThemeId } from '../../constants/terminalThemes';

export function TerminalPrefsPanel() {
  const { theme, fontSize, setTheme, setFontSize } = useTerminalPrefsStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Theme Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Theme</Text>
        <View style={styles.themeList}>
          {THEME_LIST.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.themeOption,
                theme === t.id && styles.themeOptionSelected,
              ]}
              onPress={() => setTheme(t.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.themePreview,
                  { backgroundColor: t.background },
                ]}
              >
                <Text style={[styles.themePreviewText, { color: t.foreground }]}>
                  Aa
                </Text>
                <View style={[styles.themeCursor, { backgroundColor: t.cursor }]} />
              </View>
              <View style={styles.themeInfo}>
                <Text
                  style={[
                    styles.themeName,
                    theme === t.id && styles.themeNameSelected,
                  ]}
                >
                  {t.name}
                </Text>
              </View>
              {theme === t.id && <Text style={styles.checkmark}>{">"}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Font Size */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Font Size</Text>
          <Text style={styles.fontSizeValue}>{fontSize}px</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={10}
          maximumValue={20}
          step={1}
          value={fontSize}
          onValueChange={setFontSize}
          minimumTrackTintColor="#ffffff"
          maximumTrackTintColor="#333333"
          thumbTintColor="#ffffff"
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>10px</Text>
          <Text style={styles.sliderLabel}>20px</Text>
        </View>
      </View>

      {/* Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preview</Text>
        <View
          style={[
            styles.previewContainer,
            { backgroundColor: THEME_LIST.find((t) => t.id === theme)?.background },
          ]}
        >
          <Text
            style={[
              styles.previewText,
              {
                color: THEME_LIST.find((t) => t.id === theme)?.foreground,
                fontSize: fontSize,
              },
            ]}
          >
            {`$ echo "Hello, World!"\nHello, World!\n$ _`}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  themeList: {
    gap: 8,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  themeOptionSelected: {
    borderColor: '#ffffff',
  },
  themePreview: {
    width: 48,
    height: 32,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: 12,
  },
  themePreviewText: {
    fontFamily: 'Menlo',
    fontSize: 14,
    fontWeight: 'bold',
  },
  themeCursor: {
    width: 2,
    height: 14,
    marginLeft: 2,
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  themeNameSelected: {
    color: '#ffffff',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Menlo',
  },
  fontSizeValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    fontFamily: 'Menlo',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    color: '#aaaaaa',
    fontSize: 11,
    fontFamily: 'Menlo',
  },
  previewContainer: {
    padding: 16,
    borderRadius: 8,
    minHeight: 80,
  },
  previewText: {
    fontFamily: 'Menlo',
    lineHeight: 20,
  },
});
