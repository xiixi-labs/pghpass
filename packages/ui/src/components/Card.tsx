import React, { type ReactNode } from 'react';
import { View, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { colors } from '../tokens/colors';
import { radius } from '../tokens/radius';
import { shadows } from '../tokens/shadows';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'glass' | 'dark' | 'elevated';
  style?: ViewStyle;
}

export function Card({ children, variant = 'default', style }: CardProps) {
  const variantStyle =
    variant === 'glass'
      ? styles.glass
      : variant === 'dark'
        ? styles.dark
        : variant === 'elevated'
          ? styles.elevated
          : styles.default;

  return <View style={[styles.base, variantStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  default: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    ...shadows.sm,
  },
  elevated: {
    backgroundColor: colors.white,
    ...shadows.md,
  },
  glass: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadows.sm,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any)
      : {}),
  },
  dark: {
    backgroundColor: colors.dark2,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    ...shadows.hero,
  },
});
