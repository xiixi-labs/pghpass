import React, { createContext, useContext, useState, useMemo } from 'react';
import type { ReactNode } from 'react';

const lightTheme = {
  bg: 'transparent',
  card: '#FFFFFF',
  cardBorder: 'rgba(0,0,0,0.04)',
  cardHighlight: 'transparent',
  text: '#0E0E10',
  textSecondary: '#7A7A82',
  textTertiary: '#B0B0B8',
  icon: '#0E0E10',
  iconMuted: '#7A7A82',
  separator: 'rgba(0,0,0,0.04)',
  hero: '#0E0E10',
  heroText: '#FFFFFF',
  glass: 'rgba(255,255,255,0.45)',
  searchBg: '#FFFFFF',
  searchBorder: 'rgba(0,0,0,0.25)',
  tabBarBg: 'rgba(255,255,255,0.45)',
};

const darkTheme = {
  bg: 'transparent',
  card: '#24242C',
  cardBorder: 'rgba(255,255,255,0.13)',
  cardHighlight: 'rgba(255,255,255,0.06)',
  text: '#FAFAFA',
  textSecondary: 'rgba(255,255,255,0.6)',
  textTertiary: 'rgba(255,255,255,0.35)',
  icon: '#FAFAFA',
  iconMuted: 'rgba(255,255,255,0.6)',
  separator: 'rgba(255,255,255,0.10)',
  hero: '#0A0A0C',
  heroText: '#FFFFFF',
  glass: 'rgba(28,28,36,0.70)',
  searchBg: '#2A2A34',
  searchBorder: 'rgba(255,255,255,0.15)',
  tabBarBg: 'rgba(10,10,12,0.65)',
};

export type Theme = typeof lightTheme;

interface ThemeContextValue {
  isDark: boolean;
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  theme: lightTheme,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      theme: isDark ? darkTheme : lightTheme,
      toggleTheme,
    }),
    [isDark],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
