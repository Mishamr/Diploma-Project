/**
 * Fiscus: Smart Price — Gemini-inspired Purple/Lavender Theme
 * Deep purple backgrounds with soft lavender accents and glassmorphism.
 */

export const COLORS = {
    // Primary palette
    primary: '#8b5cf6',
    primaryLight: '#a78bfa',
    primaryDark: '#6d28d9',
    primarySoft: '#c4b5fd',

    // Accent (emerald for prices/savings)
    accent: '#10b981',
    accentLight: '#34d399',
    accentDark: '#059669',

    // Backgrounds — deep purple with subtle warmth
    bgPrimary: '#0c0a1d',
    bgSecondary: '#13102b',
    bgCard: 'rgba(139, 92, 246, 0.08)',
    bgCardSolid: '#1a1438',
    bgCardLight: '#211a45',
    bgInput: '#16123a',

    // Glass morphism
    glass: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    glassLight: 'rgba(255, 255, 255, 0.1)',

    // Surface
    surface: 'rgba(139, 92, 246, 0.1)',
    surfaceHover: 'rgba(139, 92, 246, 0.18)',

    // Text
    textPrimary: '#f5f3ff',
    textSecondary: '#c4b5fd',
    textMuted: '#8b83b3',
    textDark: '#6d638e',

    // Status
    success: '#10b981',
    warning: '#fbbf24',
    error: '#f43f5e',
    info: '#60a5fa',

    // Borders
    border: 'rgba(139, 92, 246, 0.2)',
    borderLight: 'rgba(139, 92, 246, 0.1)',

    // Gradients
    gradientPurple: ['#8b5cf6', '#6d28d9', '#1a0a2e'],
    gradientGemini: ['#a78bfa', '#8b5cf6', '#6d28d9'],
    gradientAccent: ['#10b981', '#059669'],
    gradientCard: ['rgba(139, 92, 246, 0.12)', 'rgba(139, 92, 246, 0.04)'],
    gradientPromo: ['#fbbf24', '#f43f5e'],
    gradientAI: ['#60a5fa', '#8b5cf6'],
    gradientSavings: ['#10b981', '#06b6d4'],

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',

    // Base
    white: '#ffffff',
    black: '#000000',
};

export const FONTS = {
    regular: { fontSize: 14, color: COLORS.textPrimary },
    medium: { fontSize: 16, fontWeight: '500', color: COLORS.textPrimary },
    bold: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
    title: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
    subtitle: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
    caption: { fontSize: 12, color: COLORS.textSecondary },
    price: { fontSize: 20, fontWeight: '700', color: COLORS.accent },
    priceOld: { fontSize: 14, color: COLORS.textMuted, textDecorationLine: 'line-through' },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: 0.3 },
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const RADIUS = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 999,
};

export const SHADOWS = {
    card: {
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 5,
    },
    glow: {
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 8,
    },
    button: {
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 3,
    },
};

export const GLASS_STYLE = {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
};

export default { COLORS, FONTS, SPACING, RADIUS, SHADOWS, GLASS_STYLE };
