import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  type ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../tokens/colors';
import { radius } from '../tokens/radius';
import { typeScale } from '../tokens/typography';
import { shadows } from '../tokens/shadows';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'gold' | 'ghost' | 'dark';
  size?: 'default' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  style,
  icon,
}: ButtonProps) {
  const containerStyle = [
    styles.base,
    size === 'large' && styles.large,
    variant === 'primary' && styles.primary,
    variant === 'gold' && styles.gold,
    variant === 'ghost' && styles.ghost,
    variant === 'dark' && styles.dark,
    disabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.text,
    size === 'large' && styles.largeText,
    variant === 'ghost' ? styles.ghostText : styles.lightText,
    disabled ? styles.disabledText : undefined,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'ghost' ? colors.ink2 : colors.white}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text style={textStyle}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    borderRadius: radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  large: {
    paddingVertical: 18,
    borderRadius: radius.lg,
  },
  primary: {
    backgroundColor: colors.blue,
    ...shadows.md,
  },
  gold: {
    backgroundColor: colors.gold,
    ...shadows.md,
  },
  ghost: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  dark: {
    backgroundColor: colors.dark,
    ...shadows.hero,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    ...typeScale.btnPrimary,
  },
  largeText: {
    fontSize: 15,
    letterSpacing: 0.15,
  },
  lightText: {
    color: colors.white,
  },
  ghostText: {
    color: colors.ink2,
  },
  disabledText: {
    opacity: 0.7,
  },
});
