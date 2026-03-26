/**
 * Healthy Me — Theme Constants
 * Pastel pixel art aesthetic for PCOS health tracking
 */

export const Colors = {
  // Primary palette
  lavender: '#b388ff',
  pink: '#ff80ab',
  mint: '#b2dfdb',
  babyBlue: '#81d4fa',
  purple: '#7c4dff',

  // Extended palette
  softPurple: '#d1c4e9',
  peach: '#ffccbc',
  cream: '#fff8e1',
  softPink: '#fce4ec',
  skyBlue: '#b2e4fa',

  // Backgrounds
  background: '#e8f4fd',
  cardBackground: '#ffffff',
  cardBackgroundTranslucent: 'rgba(255, 255, 255, 0.85)',
  screenOverlay: 'rgba(255, 255, 255, 0.7)',

  // Text
  textPrimary: '#4a3560',
  textSecondary: '#7e6b8f',
  textMuted: '#a094b0',
  textOnDark: '#ffffff',

  // Status
  success: '#81c784',
  warning: '#ffb74d',
  error: '#e57373',
  info: '#64b5f6',

  // Tab bar
  tabBarBackground: 'rgba(255, 255, 255, 0.95)',
  tabBarActive: '#7c4dff',
  tabBarInactive: '#b0a4c0',
  tabBarBorder: 'rgba(179, 136, 255, 0.2)',
} as const;

export const Fonts = {
  pixel: 'PressStart2P',
  body: 'VT323',
} as const;

export const FontSizes = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  // VT323 needs larger sizes since it's thinner
  bodyXs: 14,
  bodySm: 18,
  bodyMd: 22,
  bodyLg: 28,
  bodyXl: 34,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const Shadows = {
  card: {
    shadowColor: '#7c4dff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;
