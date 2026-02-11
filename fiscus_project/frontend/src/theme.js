/**
 * @fileoverview Theme configuration for Fiscus mobile app.
 * 
 * Provides a centralized design system with:
 * - Color palette (Deep Dark Purple theme)
 * - Typography scales (Inter-based)
 * - Spacing system
 * - Shadow presets
 * 
 * @module theme
 */

import { Platform } from 'react-native';

/**
 * Main theme object containing all design tokens.
 * @type {Object}
 */
export const theme = {
  /**
   * Color palette regarding the new "Deep Dark Purple" design.
   */
  colors: {
    // Backgrounds
    background: '#1a0f2e',      // deep-purple - Main App Background
    surface: '#251a3d',         // dark-purple - Cards, Headers, Sidebar
    surfaceLight: '#3d2a5c',    // medium-purple - Hover states, secondary backgrounds

    // Brand colors
    primary: '#b39ddb',         // light-purple - Main Actions, Text Highlights
    primaryDark: '#9575cd',     // Slightly darker purple for active states
    secondary: '#d4c5f9',       // accent-lavender - Gradients, Accents
    secondaryLight: '#ede7f6',  // Very light lavender

    // Semantic colors
    success: '#4ade80',         // success-green
    warning: '#fbbf24',         // amber-400
    danger: '#f87171',          // danger-red
    dangerLight: 'rgba(248, 113, 113, 0.15)',
    info: '#60a5fa',            // blue-400

    // Text colors
    text: '#ffffff',            // White - Main text
    textSecondary: '#d4c5f9',   // accent-lavender - Subtitles, secondary info
    textMuted: '#9ca3af',       // Gray-400 - Low priority text
    textInverse: '#1a0f2e',     // deep-purple - Text on light buttons

    // Borders
    border: '#3d2a5c',          // medium-purple - Subtle borders
    borderLight: '#b39ddb',     // light-purple - Active borders

    // Gradients (helper objects, not strings)
    gradientPrimary: ['#b39ddb', '#d4c5f9'],

    // Special
    overlay: 'rgba(0, 0, 0, 0.6)',
    transparent: 'transparent',
  },

  /**
   * Spacing scale (4px base unit).
   */
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
  },

  /**
   * Font size scale.
   */
  fontSize: {
    xs: 10,
    small: 12,
    caption: 14,
    body: 16,
    subtitle: 18,
    title: 20,
    headline: 24,
    display: 32,
  },

  /**
   * Font weight presets (Inter approximation).
   */
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },

  /**
   * Typography presets.
   */
  typography: {
    display: {
      fontSize: 32,
      fontWeight: '800',
    },
    headline: {
      fontSize: 24,
      fontWeight: '700',
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
    },
    subtitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400',
    },
    caption: {
      fontSize: 14,
      fontWeight: '400',
    },
    small: {
      fontSize: 12,
      fontWeight: '400',
    },
  },

  /**
   * Border radius scale.
   */
  borderRadius: {
    s: 6,
    m: 10,
    l: 12,
    xl: 16,
    xxl: 24,
    round: 999,
  },

  /**
   * Shadow presets for elevation.
   * Adjusted for dark mode visibility.
   */
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 6.68,
      elevation: 8,
    },
  },

  /**
   * Z-index values for layering.
   */
  zIndex: {
    base: 1,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
  },
};

// ============================================================================
// Convenience exports
// ============================================================================

export const { colors, spacing, typography, shadows, fontSize } = theme;

/**
 * Default border radius value.
 * @type {number}
 */
export const borderRadius = theme.borderRadius.l;

/**
 * Get platform-specific shadow style.
 * Uses boxShadow for web, native shadow props for mobile.
 * 
 * @param {'none'|'small'|'medium'|'large'} size - Shadow size.
 * @returns {Object} Shadow style object.
 */
export const getShadow = (size = 'medium') => {
  const shadowDefs = {
    none: { boxShadow: 'none' },
    small: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)' },
    medium: { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.30)' },
    large: { boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.35)' },
  };

  if (Platform.OS === 'web') {
    return shadowDefs[size] || shadowDefs.medium;
  }
  return theme.shadows[size] || theme.shadows.medium;
};

/**
 * Create a color with opacity.
 * 
 * @param {string} hex - Hex color code.
 * @param {number} opacity - Opacity value (0-1).
 * @returns {string} RGBA color string.
 */
export const withOpacity = (hex, opacity) => {
  if (!hex) return 'transparent';
  // Handle already rgba
  if (hex.startsWith('rgba')) return hex;

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export default theme;
