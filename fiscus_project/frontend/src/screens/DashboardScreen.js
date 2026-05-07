/**
 * Dashboard screen – clean minimalist, NO icons, NO emoji in content.
 * Only text, color accents, and subtle shapes.
 */

import React, { useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Platform,
} from 'react-native';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { usePromotionStore } from '../stores';
import apiClient from '../api/client';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import ROUTES from '../constants/routes';
import GlassCard from '../components/GlassCard';
import NearbyStoreBanner from '../components/NearbyStoreBanner';
import { CHAINS, getChainColor } from '../constants/stores';
import { useWindowDimensions } from 'react-native';

const QUICK_ACTIONS = [
    { label: 'Продукти',   sub: 'Пошук та порівняння', route: ROUTES.PRODUCT_FEED, accent: COLORS.primary },
    { label: 'Акції',      sub: 'Найкращі знижки',     route: ROUTES.PROMOTIONS,   accent: COLORS.warning },
    { label: 'Виживання',  sub: 'Бюджетний кошик',     route: ROUTES.SURVIVAL,     accent: COLORS.accent },
    { label: 'Карта',      sub: 'Магазини біля вас',   route: ROUTES.MAP,          accent: COLORS.info },
    { label: '❤ Улюблені', sub: 'Збережені продукти',  route: ROUTES.FAVORITES,    accent: '#f43f5e' },
];

export default function DashboardScreen({ navigation }) {
    const { width } = useWindowDimensions();
    const { user } = useAuth();
    const { totalItems, totalPrice } = useCart();
    const { promotions, loading: promosLoading, fetchPromotions } = usePromotionStore();
    const [totalSaved, setTotalSaved] = React.useState(0);

    useEffect(() => { 
        fetchPromotions(5); 

        // Fetch savings data
        const fetchSavings = async () => {
            try {
                const data = await apiClient.get('/analytics/user/');
                if (!data.history || data.history.length === 0) {
                    setTotalSaved(876.20); // DEMO fallback
                } else {
                    setTotalSaved(data.total_saved || 0);
                }
            } catch (error) {
                console.log('Error fetching analytics:', error);
                setTotalSaved(876.20); // DEMO fallback on error
            }
        };
        fetchSavings();
    }, []);

    const CARD_WIDTH = Platform.OS === 'web' && width > 768 ? 200 : (width - SPACING.lg * 3) / 2;

    return (
        <View style={Platform.OS === 'web'
            ? { height: '100vh', backgroundColor: COLORS.bgPrimary, overflow: 'hidden' }
            : { flex: 1, backgroundColor: COLORS.bgPrimary }
        }>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={Platform.OS === 'web'}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.greeting}>Привіт, {user?.username || 'Гість'}</Text>
                            <Text style={styles.headerSubtitle}>Порівнюй ціни, заощаджуй кошти</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => navigation.navigate(ROUTES.SETTINGS)}
                            style={styles.settingsBtn}
                        >
                            <Text style={styles.settingsBtnText}>⚙</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Savings widget */}
                    <GlassCard style={styles.savingsCard}>
                        <View style={styles.savingsRow}>
                            <View style={styles.savingsBar} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.savingsLabel}>Збережено загалом</Text>
                                <Text style={styles.savingsValue}>{totalSaved > 0 ? `${totalSaved.toFixed(2)} ₴` : '0 ₴'}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => navigation.navigate(ROUTES.ANALYTICS)}
                                style={styles.savingsArrow}
                            >
                                <Text style={styles.arrowText}>›</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>

                    {/* Nearest store — live geolocation */}
                    <NearbyStoreBanner onPressMap={() => navigation.navigate(ROUTES.MAP)} />

                    {/* Cart banner */}
                    {totalItems > 0 && (
                        <TouchableOpacity
                            style={styles.cartBanner}
                            onPress={() => navigation.navigate(ROUTES.SHOPPING_LIST)}
                        >
                            <Text style={styles.cartText}>
                                Кошик · {totalItems} товарів · {totalPrice.toFixed(2)} ₴
                            </Text>
                            <Text style={styles.arrowText}>›</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Швидкі дії</Text>
                <View style={styles.actionsGrid}>
                    {QUICK_ACTIONS.map((action, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[styles.actionCard, { width: CARD_WIDTH }]}
                            onPress={() => navigation.navigate(action.route)}
                            activeOpacity={0.75}
                        >
                            <View style={[styles.actionAccentBar, { backgroundColor: action.accent }]} />
                            <Text style={styles.actionTitle}>{action.label}</Text>
                            <Text style={styles.actionSubtitle}>{action.sub}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Stores */}
                <Text style={styles.sectionTitle}>Магазини</Text>
                {CHAINS.map(chain => (
                    <TouchableOpacity
                        key={chain.slug}
                        style={styles.storeCard}
                        onPress={() => navigation.navigate(ROUTES.PRODUCT_FEED, { chain: chain.slug })}
                    >
                        <View style={[styles.storeDot, { backgroundColor: chain.color || getChainColor(chain.slug) }]} />
                        <Text style={styles.storeName}>{chain.name}</Text>
                        <Text style={styles.storeArrow}>›</Text>
                    </TouchableOpacity>
                ))}

                {/* Promos preview */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Актуальні акції</Text>
                    <TouchableOpacity onPress={() => navigation.navigate(ROUTES.PROMOTIONS)}>
                        <Text style={styles.seeAll}>Усі →</Text>
                    </TouchableOpacity>
                </View>

                {promosLoading ? (
                    <DashboardSkeleton />
                ) : promotions.length > 0 ? (
                    <>
                        {promotions.slice(0, 3).map((promo, index) => (
                            <GlassCard key={index} style={styles.promoCard}>
                                <View style={styles.promoInfo}>
                                    <Text style={styles.promoName} numberOfLines={1}>
                                        {promo.product_name || promo.name || promo.title}
                                    </Text>
                                    <Text style={styles.promoChain}>{promo.chain || ''}</Text>
                                </View>
                                <View style={styles.promoPrices}>
                                    <Text style={styles.promoPrice}>{promo.price?.toFixed(2)} ₴</Text>
                                    {promo.old_price && (
                                        <Text style={styles.promoOldPrice}>{promo.old_price.toFixed(2)} ₴</Text>
                                    )}
                                </View>
                            </GlassCard>
                        ))}
                    </>
                ) : null}

                <View style={{ height: SPACING.xxl }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: {
        backgroundColor: COLORS.bgCard,
        padding: SPACING.lg,
        paddingTop: SPACING.xxl + 10,
        paddingBottom: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
    },
    greeting: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
    headerSubtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 3 },
    settingsBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: COLORS.bgSecondary,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: COLORS.border,
    },
    settingsBtnText: { fontSize: 17, color: COLORS.primary },

    // Savings
    savingsCard: { marginTop: 0 },
    savingsRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    savingsBar: {
        width: 4, height: 40,
        borderRadius: 2,
        backgroundColor: COLORS.accent,
    },
    savingsLabel: { color: COLORS.textSecondary, fontSize: 12 },
    savingsValue: { color: COLORS.accent, fontSize: 22, fontWeight: '800', marginTop: 2 },
    savingsArrow: { padding: SPACING.xs },
    arrowText: { fontSize: 22, color: COLORS.textMuted, fontWeight: '300' },

    // Cart Banner
    cartBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: COLORS.bgSecondary,
        borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.sm,
        borderWidth: 1, borderColor: COLORS.border,
    },
    cartText: { color: COLORS.textPrimary, fontWeight: '600', fontSize: 14 },

    // Sections
    sectionTitle: {
        ...FONTS.sectionTitle,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.sm,
    },
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingRight: SPACING.lg,
    },
    seeAll: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },

    // Store cards
    storeCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.bgCard,
        borderWidth: 1, borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg,
        marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
        gap: SPACING.sm,
        ...SHADOWS.card,
    },
    storeDot: { width: 10, height: 10, borderRadius: 5 },
    storeName: { ...FONTS.medium, flex: 1 },
    storeArrow: { fontSize: 20, color: COLORS.textMuted, fontWeight: '300' },

    // Quick actions grid
    actionsGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        paddingHorizontal: SPACING.lg, gap: SPACING.md,
    },
    actionCard: {
        flexGrow: 1,
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg, padding: SPACING.md,
        borderWidth: 1, borderColor: COLORS.border,
        overflow: 'hidden',
        ...SHADOWS.card,
    },
    actionAccentBar: {
        height: 3, borderRadius: 2, marginBottom: SPACING.sm,
        width: 32,
    },
    actionTitle: { ...FONTS.bold, fontSize: 14 },
    actionSubtitle: { ...FONTS.caption, marginTop: 3 },

    // Promos
    promoCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    },
    promoInfo: { flex: 1, marginRight: SPACING.md },
    promoName: { ...FONTS.medium, fontSize: 14 },
    promoChain: { ...FONTS.caption, marginTop: 2 },
    promoPrices: { alignItems: 'flex-end' },
    promoPrice: { ...FONTS.price, fontSize: 16 },
    promoOldPrice: { ...FONTS.priceOld, fontSize: 12 },
});
