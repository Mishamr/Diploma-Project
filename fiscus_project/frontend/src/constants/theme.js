/**
 * Fiscus: Smart Price — Minimalist Light Purple / Lavender Theme
 * Visible lavender backgrounds, violet accents.
 */

export const COLORS = {
    // Primary palette — Violet/Indigo
    primary: '#7C3AED',
    primaryLight: '#A78BFA',
    primaryDark: '#5B21B6',
    primarySoft: '#EDE9FE',

    // Accent (emerald for prices/savings)
    accent: '#059669',
    accentLight: '#10B981',
    accentDark: '#047857',

    // Backgrounds — genuine light lavender (NOT white)
    bgPrimary: '#EDE9FE',       // видима лаванда
    bgSecondary: '#DDD6FE',     // темніша лаванда
    bgCard: '#F5F3FF',          // ніжна лаванда для карток
    bgCardSolid: '#F5F3FF',
    bgCardLight: '#F7F5FF',
    bgInput: '#F7F5FF',

    // Glass (for legacy refs)
    glass: 'rgba(255,255,255,0.6)',
    glassBorder: 'rgba(124,58,237,0.15)',
    glassLight: 'rgba(255,255,255,0.8)',

    // Surfaces
    surface: '#E8E4FF',
    surfaceHover: '#DDD6FE',

    // Text
    textPrimary: '#1E1B4B',
    textSecondary: '#5B21B6',
    textMuted: '#7C6FAA',
    textDark: '#4B5563',

    // Status
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',

    // Borders
    border: '#C4B5FD',
    borderLight: '#DDD6FE',

    // Gradients (data viz only)
    gradientPurple: ['#7C3AED', '#5B21B6'],
    gradientGemini: ['#A78BFA', '#7C3AED'],
    gradientAccent: ['#059669', '#047857'],
    gradientCard: ['#F5F3FF', '#EDE9FE'],
    gradientPromo: ['#D97706', '#DC2626'],
    gradientAI: ['#2563EB', '#7C3AED'],
    gradientSavings: ['#059669', '#0891B2'],

    // Overlay
    overlay: 'rgba(30, 27, 75, 0.4)',

    // Base — milky lavender, slightly purple-tinted white
    white: '#F2EDFF',
    black: '#1E1B4B',
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
        boxShadow: '0px 2px 12px rgba(124, 58, 237, 0.12)',
        elevation: 3,
    },
    glow: {
        boxShadow: '0px 4px 20px rgba(124, 58, 237, 0.2)',
        elevation: 6,
    },
    button: {
        boxShadow: '0px 2px 8px rgba(124, 58, 237, 0.25)',
        elevation: 2,
    },
};

export const GLASS_STYLE = {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
};

export default { COLORS, FONTS, SPACING, RADIUS, SHADOWS, GLASS_STYLE };
