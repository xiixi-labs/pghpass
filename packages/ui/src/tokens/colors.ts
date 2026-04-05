export const colors = {
  // Brand — used sparingly, with intent
  blue: '#003087',
  blueLight: '#1A4FA0',
  gold: '#C8900A',
  goldLight: '#E5B84C',
  red: '#C60C30',

  // Brand tints — subtle backgrounds
  blueTint: '#EEF1F8',
  goldTint: '#FDF8EE',
  redTint: '#FCEEF1',

  // Dark palette — for hero cards and premium sections
  dark: '#0A0A0C',
  dark2: '#141418',
  dark3: '#1C1C22',
  dark4: '#26262E',
  darkText: '#FAFAFA',
  darkTextSecondary: 'rgba(255,255,255,0.6)',
  darkTextTertiary: 'rgba(255,255,255,0.35)',
  darkBorder: 'rgba(255,255,255,0.08)',
  darkBorderLight: 'rgba(255,255,255,0.12)',

  // Neutrals — do all the work
  ink: '#0E0E10',
  ink2: '#3A3A3E',
  ink3: '#7A7A82',
  ink4: '#B0B0B8',
  rule: '#E8E8EC',
  rule2: '#F2F2F5',

  // Surfaces
  white: '#FFFFFF',
  screen: '#F6F6F4',
  page: '#EEECEA',

  // Glass — for frosted overlays
  glass: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(255,255,255,0.5)',
  glassDark: 'rgba(10,10,12,0.65)',
  glassDarkBorder: 'rgba(255,255,255,0.1)',

  // Semantic
  success: '#1A8F4B',
  successTint: '#E8F7ED',
  error: '#C60C30',
  errorTint: '#FCEEF1',
  warning: '#B8760A',
  warningTint: '#FFF8E8',
} as const;

export type ColorToken = keyof typeof colors;
