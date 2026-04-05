import React from 'react';
import { View, Text, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { colors } from '../tokens/colors';
import { radius } from '../tokens/radius';
import { shadows } from '../tokens/shadows';
import { typeScale } from '../tokens/typography';

interface InputProps extends TextInputProps {
  label?: string;
}

export function Input({ label, style, ...props }: InputProps) {
  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.ink4}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typeScale.eyebrow,
    color: colors.ink3,
    fontWeight: '700',
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontFamily: typeScale.bodySm.fontFamily,
    fontSize: typeScale.bodySm.fontSize,
    color: colors.ink,
    ...shadows.xs,
  },
});
