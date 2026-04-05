import React, { type ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '../tokens/colors';

interface ListRowProps {
  children: ReactNode;
  last?: boolean;
  style?: ViewStyle;
}

export function ListRow({ children, last = false, style }: ListRowProps) {
  return (
    <View style={[styles.row, !last && styles.border, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
});
