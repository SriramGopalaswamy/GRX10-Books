/**
 * GRX10 Design System Tokens
 * Centralized design tokens for colors, spacing, typography, and motion.
 */

// ── Colors ──────────────────────────────────────────────────────────
export const colors = {
  primary: {
    DEFAULT: '#3A2F78',
    50: '#EEEDFA',
    100: '#D4D0F2',
    200: '#AEA6E5',
    300: '#877CD8',
    400: '#6152CB',
    500: '#3A2F78',
    600: '#312868',
    700: '#282158',
    800: '#1F1A48',
    900: '#161338',
  },
  accent: {
    DEFAULT: '#E6007E',
    50: '#FFF0F7',
    100: '#FFD6EA',
    200: '#FFADD5',
    300: '#FF85C0',
    400: '#FF3DA0',
    500: '#E6007E',
    600: '#CC006F',
    700: '#A30059',
    800: '#7A0043',
    900: '#52002D',
  },
  text: {
    primary: '#FFFFFF',
    body: '#1E1E2F',
    muted: '#6C6C8A',
    light: '#9999B0',
    inverse: '#FFFFFF',
  },
  background: {
    primary: '#F8F8F8',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    dark: '#1E1E2F',
    darkSurface: '#2A2A42',
  },
  muted: '#6C6C8A',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

// ── Spacing (4px base grid) ─────────────────────────────────────────
export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

// ── Typography ──────────────────────────────────────────────────────
export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ── Motion & Timing ─────────────────────────────────────────────────
export const motion = {
  duration: {
    instant: '75ms',
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    glacial: '500ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// ── Shadows ─────────────────────────────────────────────────────────
export const shadows = {
  sm: '0 1px 2px 0 rgba(58, 47, 120, 0.05)',
  md: '0 4px 6px -1px rgba(58, 47, 120, 0.08), 0 2px 4px -1px rgba(58, 47, 120, 0.04)',
  lg: '0 10px 15px -3px rgba(58, 47, 120, 0.08), 0 4px 6px -2px rgba(58, 47, 120, 0.04)',
  xl: '0 20px 25px -5px rgba(58, 47, 120, 0.1), 0 10px 10px -5px rgba(58, 47, 120, 0.04)',
  header: '0 2px 8px rgba(58, 47, 120, 0.12)',
} as const;

// ── Border Radius ───────────────────────────────────────────────────
export const radii = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  full: '9999px',
} as const;
