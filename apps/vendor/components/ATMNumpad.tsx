import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@pgh-pass/ui';

interface ATMNumpadProps {
  cents: number;
  onCentsChange: (cents: number) => void;
}

const MAX_CENTS = 99999; // $999.99

export function ATMNumpad({ cents, onCentsChange }: ATMNumpadProps) {
  const handlePress = (digit: number) => {
    const newCents = cents * 10 + digit;
    if (newCents <= MAX_CENTS) {
      onCentsChange(newCents);
    }
  };

  const handleDelete = () => {
    onCentsChange(Math.floor(cents / 10));
  };

  const rows = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ];

  return (
    <View style={styles.numpad}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((digit) => (
            <TouchableOpacity
              key={digit}
              style={styles.key}
              onPress={() => handlePress(digit)}
              activeOpacity={0.4}
            >
              <Text style={styles.keyText}>{digit}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <View style={styles.row}>
        <View style={styles.key} />
        <TouchableOpacity
          style={styles.key}
          onPress={() => handlePress(0)}
          activeOpacity={0.4}
        >
          <Text style={styles.keyText}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.key}
          onPress={handleDelete}
          activeOpacity={0.4}
        >
          <Feather name="delete" size={22} color="rgba(255,255,255,0.35)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Format integer cents to display string: $X.XX */
export function formatCents(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const remainder = cents % 100;
  return `$${dollars}.${remainder.toString().padStart(2, '0')}`;
}

/** Convert cents to decimal amount for API */
export function centsToAmount(cents: number): number {
  return cents / 100;
}

const styles = StyleSheet.create({
  numpad: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    gap: 2,
  },
  row: {
    flexDirection: 'row',
  },
  key: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 26,
    fontWeight: '300',
    color: colors.darkText,
    letterSpacing: -0.5,
  },
});
