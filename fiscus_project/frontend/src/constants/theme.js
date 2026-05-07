/**
 * Fiscus: Smart Price — Minimalist Soft Light Theme
 * Gentle, warm near-white tones with subtle purple accents.
 */

export const COLORS = {
    // Primary palette — Violet/Indigo
    primary: '#7C3AED',
    primaryLight: '#A78BFA',
    primaryDark: '#5B21B6',
    primarySoft: '#F0ECFA',

    // Accent (emerald for prices/savings)
    accent: '#059669',
    accentLight: '#10B981',
    accentDark: '#047857',

    // Backgrounds — м'які, теплі, без насиченої лаванди
    bgPrimary: '#F8F7FC',       // дуже ніжний сіро-фіолетовий
    bgSecondary: '#F0EDF6',     // ніжний лілово-сірий
    bgCard: '#FFFFFF',          // чистий білий для карток
    bgCardSolid: '#FFFFFF',
    bgCardLight: '#FAFAFE',
    bgInput: '#F4F3F8',

    // Glass (for legacy refs)
    glass: 'rgba(255,255,255,0.75)',
    glassBorder: 'rgba(124,58,237,0.10)',
    glassLight: 'rgba(255,255,255,0.9)',

    // Surfaces
    surface: '#F2F0F7',
    surfaceHover: '#EBE8F2',

    // Text
    textPrimary: '#1E1B4B',
    textSecondary: '#6B5CA5',
    textMuted: '#9B95AE',
    textDark: '#4B5563',

    // Status
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',

    // Borders — ніжні, не насичені
    border: '#E8E5EF',
    borderLight: '#F0EDF4',

    // Gradients (data viz only)
    gradientPurple: ['#7C3AED', '#5B21B6'],
    gradientGemini: ['#A78BFA', '#7C3AED'],
    gradientAccent: ['#059669', '#047857'],
    gradientCard: ['#FFFFFF', '#F8F7FC'],
    gradientPromo: ['#D97706', '#DC2626'],
    gradientAI: ['#2563EB', '#7C3AED'],
    gradientSavings: ['#059669', '#0891B2'],

    // Overlay
    overlay: 'rgba(30, 27, 75, 0.35)',

    // Base
    white: '#FDFCFF',
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
