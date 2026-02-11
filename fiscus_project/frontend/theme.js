// theme.js – colour palette and dark mode settings
export const colors = {
    background: '#121212', // dark background
    surface: '#1E1E1E',
    primary: '#00C853', // vibrant green accent
    onPrimary: '#FFFFFF',
    textPrimary: '#E0E0E0',
    textSecondary: '#B0B0B0',
    border: '#333333',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const typography = {
    header: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    body: {
        fontSize: 16,
        fontWeight: '400',
        color: colors.textSecondary,
    },
};
