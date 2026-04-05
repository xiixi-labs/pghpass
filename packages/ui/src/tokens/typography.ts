import { Platform } from 'react-native';

export const fontFamilies = {
  sans: Platform.select({ ios: 'Inter', android: 'Inter', default: 'Inter' }),
  serif: Platform.select({
    ios: 'InstrumentSerif-Regular',
    android: 'InstrumentSerif-Regular',
    default: 'Instrument Serif',
  }),
  serifItalic: Platform.select({
    ios: 'InstrumentSerif-Italic',
    android: 'InstrumentSerif-Italic',
    default: 'Instrument Serif',
  }),
} as const;

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const typeScale = {
  display: {
    fontFamily: fontFamilies.serif,
    fontSize: 52,
    fontWeight: fontWeights.regular,
    letterSpacing: -1.56,
    lineHeight: 52,
  },
  displayMd: {
    fontFamily: fontFamilies.serif,
    fontSize: 38,
    fontWeight: fontWeights.regular,
    letterSpacing: -1.14,
    lineHeight: 40,
  },
  displaySm: {
    fontFamily: fontFamilies.serif,
    fontSize: 28,
    fontWeight: fontWeights.regular,
    letterSpacing: -0.56,
    lineHeight: 32,
  },
  h1: {
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  h2: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.32,
    lineHeight: 20,
  },
  h3: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    letterSpacing: -0.14,
    lineHeight: 18,
  },
  body: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    fontWeight: fontWeights.regular,
    letterSpacing: 0,
    lineHeight: 20,
  },
  bodySm: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    fontWeight: fontWeights.regular,
    letterSpacing: 0,
    lineHeight: 18,
  },
  label: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.44,
    lineHeight: 14,
  },
  caption: {
    fontFamily: fontFamilies.sans,
    fontSize: 10,
    fontWeight: fontWeights.medium,
    letterSpacing: 0,
    lineHeight: 14,
  },
  eyebrow: {
    fontFamily: fontFamilies.sans,
    fontSize: 9,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.72,
    lineHeight: 12,
    textTransform: 'uppercase' as const,
  },
  micro: {
    fontFamily: fontFamilies.sans,
    fontSize: 8,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.16,
    lineHeight: 10,
  },
  btnPrimary: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.26,
    lineHeight: 16,
  },
} as const;
