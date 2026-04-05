import { View, Image, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const lightBg = require('../assets/pgh-blur-bg.jpg');
const darkBg = require('../assets/pgh-dark-bg.png');

export function ScreenBackground({ children }: { children: ReactNode }) {
  const { isDark } = useTheme();

  return (
    <View style={styles.root}>
      <Image source={isDark ? darkBg : lightBg} style={styles.bgImage} resizeMode="cover" />
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: isDark
              ? 'rgba(0,0,0,0.78)'
              : 'rgba(246,246,244,0.75)',
          },
        ]}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
});
