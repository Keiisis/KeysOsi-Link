/* ═══════════════════════════════════════════════════════════
   Retour Gagnant Bénin — Design Tokens Premium
   Palette : Or / Blanc Ivoire / Bleu Nuit (PAS de noir)
   Typography : Playfair Display (titres) / Inter (corps)
   ─── UI/UX Pro Max compliant ───
═══════════════════════════════════════════════════════════ */

export const colors = {
    // ── Or luxe (primaire) ──
    gold: '#C9A84C',
    goldLight: '#E2C97E',
    goldDark: '#A68B3C',
    goldSoft: '#F5EDD6',
    goldMuted: 'rgba(201, 168, 76, 0.12)',
    goldShimmer: 'rgba(201, 168, 76, 0.06)',

    // ── Fonds — Ivoire / Crème (jamais noir) ──
    background: '#FAF8F4',
    surface: '#FFFFFF',
    surfaceWarm: '#FDF9F3',
    surfaceElevated: '#F6F3ED',
    headerBg: '#1B2A4A',

    // ── Textes ──
    textPrimary: '#1B2A4A',
    textSecondary: '#5C6B82',
    textMuted: '#9BA4B3',
    textGold: '#A68B3C',
    textOnDark: '#F5F1E8',
    textOnGold: '#FFFFFF',

    // ── Bleu nuit / Marine ──
    navy: '#1B2A4A',
    navyLight: '#2A3F66',
    navyMuted: 'rgba(27, 42, 74, 0.08)',

    // ── Statuts ──
    success: '#2D9F63',
    successLight: '#E8F7EF',
    successBg: 'rgba(45, 159, 99, 0.08)',

    warning: '#E5A220',
    warningLight: '#FFF6E0',
    warningBg: 'rgba(229, 162, 32, 0.08)',

    danger: '#D94452',
    dangerLight: '#FDECEE',
    dangerBg: 'rgba(217, 68, 82, 0.08)',

    info: '#3B82C4',
    infoLight: '#EBF3FB',
    infoBg: 'rgba(59, 130, 196, 0.08)',

    // ── Borders ──
    border: '#E8E2D6',
    borderLight: '#F0EBE1',
    borderGold: 'rgba(201, 168, 76, 0.25)',

    // ── Overlays ──
    overlay: 'rgba(27, 42, 74, 0.45)',
    overlayLight: 'rgba(27, 42, 74, 0.08)',
}

export const gradients = {
    gold: ['#C9A84C', '#E2C97E'] as string[],
    goldSubtle: ['rgba(201,168,76,0.08)', 'rgba(201,168,76,0.02)'] as string[],
    navy: ['#1B2A4A', '#2A3F66'] as string[],
    warmBg: ['#FAF8F4', '#FDF9F3'] as string[],
    card: ['#FFFFFF', '#FDFBF7'] as string[],
}

export const spacing = {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
}

export const radius = {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    full: 999,
}

export const shadows = {
    xs: {
        shadowColor: '#1B2A4A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    sm: {
        shadowColor: '#1B2A4A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    md: {
        shadowColor: '#1B2A4A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 5,
    },
    lg: {
        shadowColor: '#1B2A4A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.10,
        shadowRadius: 24,
        elevation: 8,
    },
    gold: {
        shadowColor: '#C9A84C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.20,
        shadowRadius: 14,
        elevation: 6,
    },
}

// ── Familles de polices (chargées via expo-google-fonts) ──
export const fonts = {
    heading: 'PlayfairDisplay_700Bold',
    headingRegular: 'PlayfairDisplay_400Regular',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemibold: 'Inter_600SemiBold',
    bodyBold: 'Inter_700Bold',
}

export const typography = {
    h1: { fontSize: 28, fontFamily: 'PlayfairDisplay_700Bold', letterSpacing: 0.3 },
    h2: { fontSize: 22, fontFamily: 'PlayfairDisplay_700Bold', letterSpacing: 0.2 },
    h3: { fontSize: 18, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.1 },
    body: { fontSize: 16, fontFamily: 'Inter_400Regular', lineHeight: 24 },
    bodySmall: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21 },
    caption: { fontSize: 12, fontFamily: 'Inter_500Medium', lineHeight: 16 },
    overline: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, textTransform: 'uppercase' as const },
    label: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
    button: { fontSize: 15, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
}
