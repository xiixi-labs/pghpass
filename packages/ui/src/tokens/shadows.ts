import { Platform, type ViewStyle } from 'react-native';

type ShadowStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

const makeShadow = (
  offsetY: number,
  opacity: number,
  blurRadius: number,
  elevation: number,
): ShadowStyle =>
  Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: blurRadius,
    },
    android: { elevation },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: blurRadius,
    },
  }) as ShadowStyle;

export const shadows = {
  /** Barely there — input borders, subtle depth */
  xs: makeShadow(1, 0.04, 2, 1),
  /** Cards resting on surface */
  sm: makeShadow(2, 0.06, 8, 2),
  /** Elevated cards, modals */
  md: makeShadow(8, 0.08, 24, 6),
  /** Floating elements, popovers */
  lg: makeShadow(16, 0.12, 40, 10),
  /** Hero cards — dramatic depth */
  hero: makeShadow(24, 0.18, 48, 14),
} as const;

/** Dark mode shadows — higher opacity to be visible on dark backgrounds */
export const darkShadows = {
  xs: makeShadow(1, 0.3, 3, 2),
  sm: makeShadow(2, 0.4, 10, 4),
  md: makeShadow(8, 0.5, 28, 8),
  lg: makeShadow(16, 0.6, 44, 12),
  hero: makeShadow(24, 0.7, 52, 16),
} as const;

/** Web-only glass effect styles (use with Platform.select or web-only code) */
export const glassEffect = {
  light: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  dark: {
    backgroundColor: 'rgba(10,10,12,0.65)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  subtle: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
} as const;
