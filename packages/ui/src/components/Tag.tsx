import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../tokens/colors';
import { typeScale } from '../tokens/typography';
import { radius } from '../tokens/radius';

type TagVariant = 'gold' | 'blue' | 'red' | 'neutral';

interface TagProps {
  label: string;
  variant?: TagVariant;
}

const variantStyles: Record<TagVariant, { bg: string; text: string; border: string }> = {
  gold: { bg: colors.goldTint, text: colors.gold, border: 'rgba(200,144,10,0.2)' },
  blue: { bg: colors.blueTint, text: colors.blue, border: 'rgba(0,48,135,0.18)' },
  red: { bg: colors.redTint, text: colors.red, border: 'rgba(198,12,48,0.2)' },
  neutral: { bg: colors.rule2, text: colors.ink3, border: colors.rule },
};

export function Tag({ label, variant = 'neutral' }: TagProps) {
  const v = variantStyles[variant];
  return (
    <View style={[styles.tag, { backgroundColor: v.bg, borderColor: v.border }]}>
      <Text style={[styles.text, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm / 2,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    ...typeScale.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.48,
  },
});
