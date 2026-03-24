/**
 * Dashboard screen — Gemini-inspired with store chips, settings, savings.
 */

import React, { useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    SafeAreaView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { usePromotionStore } from '../stores';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import ROUTES from '../constants/routes';
import GlassCard from '../components/GlassCard';
import { CHAINS, getChainColor } from '../constants/stores';
import { useWindowDimensions } from 'react-native';

export default function DashboardScreen({ navigation }) {
    const { width } = useWindowDimensions();
    const CARD_WIDTH = Platform.OS === 'web' && width > 768 ? 220 : (width - SPACING.lg * 3) / 2;
    const { user } = useAuth();
    const { totalItems, totalPrice } = useCart();
    const { promotions, loading: promosLoading, fetchPromotions } = usePromotionStore();

    useEffect(() => {
        fetchPromotions(5);
    }, []);

    const quickActions = [
        {
            icon: 'search',
            title: 'Продукти',
            subtitle: 'Пошук та порівняння',
            colors: [COLORS.primary, COLORS.primaryDark],
            route: ROUTES.PRODUCT_FEED,
        },
        {
            icon: 'pricetag',
            title: 'Акції',
            subtitle: 'Найкращі знижки',
            colors: ['#fbbf24', '#d97706'],
            route: ROUTES.PROMOTIONS,
        },
        {
            icon: 'shield',
            title: 'Виживання',
            subtitle: 'Бюджетний кошик',
            colors: [COLORS.accent, COLORS.accentDark],
            route: ROUTES.SURVIVAL,
        },
        {
            icon: 'map',
            title: 'Карта',
            subtitle: 'Магазини біля вас',
            colors: ['#60a5fa', '#2563eb'],
            route: ROUTES.MAP,
        },
    ];

    return (
        <View style={Platform.OS === 'web' ? { height: '100vh', backgroundColor: COLORS.bgPrimary, overflow: 'hidden' } : { flex: 1, backgroundColor: COLORS.bgPrimary }}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={Platform.OS === 'web'}>
            {/* Header with gradient */}
            <LinearGradient
                colors={COLORS.gradientGemini}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.greeting}>
                            Привіт, {user?.username || 'Гість'}
                        </Text>
                        <Text style={styles.headerSubtitle}>
                            Порівнюй ціни, заощаджуй кошти
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate(ROUTES.SETTINGS)}
                        style={styles.settingsBtn}
                    >
                        <Icon name="settings-outline" size={24} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                </View>

                {/* Savings widget */}
                <GlassCard style={styles.savingsCard}>
                    <View style={styles.savingsRow}>
                        <View style={styles.savingsIcon}>
                            <Icon name="trending-up" size={20} color={COLORS.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.savingsLabel}>Збережено цього місяця</Text>
                            <Text style={styles.savingsValue}>0 ₴</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => navigation.navigate(ROUTES.ANALYTICS)}
                            style={styles.savingsArrow}
                        >
                            <Icon name="chevron-forward" size={18} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>
                </GlassCard>

                {/* Cart banner */}
                {totalItems > 0 && (
                    <TouchableOpacity
                        style={styles.cartBanner}
                        onPress={() => navigation.navigate(ROUTES.SHOPPING_LIST)}
                    >
                        <View style={styles.cartInfo}>
                            <Icon name="cart" size={18} color={COLORS.accent} />
                            <Text style={styles.cartText}>
                                {totalItems} товарів · {totalPrice.toFixed(2)} ₴
                            </Text>
                        </View>
                        <Icon name="chevron-forward" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                )}
            </LinearGradient>

            {/* Stores section */}
            <Text style={styles.sectionTitle}>🏪 Магазини</Text>
            {CHAINS.map(chain => (
                <TouchableOpacity
                    key={chain.slug}
                    style={styles.atbCard}
                    onPress={() => navigation.navigate(ROUTES.PRODUCT_FEED, { chain: chain.slug })}
                >
                    <View style={[styles.atbDot, { backgroundColor: chain.color || getChainColor(chain.slug) }]} />
                    <Text style={styles.atbName}>{chain.name} Маркет</Text>
                    <Icon name="chevron-forward" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
            ))}

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>⚡ Швидкі дії</Text>
            <View style={styles.actionsGrid}>
                {quickActions.map((action, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.actionCard}
                        onPress={() => navigation.navigate(action.route)}
                        activeOpacity={0.7}
                    >
                        <LinearGradient
                            colors={action.colors}
                            style={styles.actionIcon}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Icon name={action.icon} size={22} color={COLORS.white} />
                        </LinearGradient>
                        <Text style={styles.actionTitle}>{action.title}</Text>
                        <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Promotions preview */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🔥 Актуальні акції</Text>
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
    container: {
        flex: 1,
    },
    header: {
        padding: SPACING.lg,
        paddingTop: SPACING.xxl + 10,
        paddingBottom: SPACING.lg,
        borderBottomLeftRadius: RADIUS.xl,
        borderBottomRightRadius: RADIUS.xl,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    greeting: {
        ...FONTS.title,
        fontSize: 22,
        color: '#fff',
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        marginTop: SPACING.xs,
    },
    settingsBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    savingsCard: {
        marginTop: SPACING.md,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderColor: 'rgba(255,255,255,0.12)',
    },
    savingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    savingsIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    savingsLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
    },
    savingsValue: {
        color: COLORS.accent,
        fontSize: 20,
        fontWeight: '800',
    },
    savingsArrow: {
        padding: SPACING.xs,
    },
    cartBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginTop: SPACING.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    cartInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    cartText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    sectionTitle: {
        ...FONTS.sectionTitle,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: SPACING.lg,
    },
    seeAll: {
        color: COLORS.primaryLight,
        fontSize: 14,
        fontWeight: '600',
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: SPACING.lg,
        gap: SPACING.md,
    },
    actionCard: {
        width: Platform.OS === 'web' ? 240 : (Dimensions.get('window').width - SPACING.lg * 3) / 2,
        flexGrow: 1,
        backgroundColor: COLORS.glass,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        ...SHADOWS.card,
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    actionTitle: {
        ...FONTS.bold,
        fontSize: 14,
    },
    actionSubtitle: {
        ...FONTS.caption,
        marginTop: 2,
    },
    promoCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.sm,
    },
    promoInfo: {
        flex: 1,
        marginRight: SPACING.md,
    },
    promoName: {
        ...FONTS.medium,
        fontSize: 14,
    },
    promoChain: {
        ...FONTS.caption,
        marginTop: 2,
    },
    promoPrices: {
        alignItems: 'flex-end',
    },
    promoPrice: {
        ...FONTS.price,
        fontSize: 16,
    },
    promoOldPrice: {
        ...FONTS.priceOld,
        fontSize: 12,
    },
    atbCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.glass,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.sm,
        gap: SPACING.sm,
    },
    atbDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    atbName: {
        ...FONTS.medium,
        flex: 1,
    },
});
