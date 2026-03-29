/**
 * CompareCartScreen — порівняння цін по мережах.
 * Якщо кошик порожній або БД не має даних — показує демо порівняння.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import { useCart } from '../context/CartContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import api from '../api/client';
import ROUTES from '../constants/routes';
import * as Location from 'expo-location';

// ── Demo порівняння для показу ────────────────────────────────────────────────
const DEMO_RESULTS = [
    { chain: 'АТБ', chain_slug: 'atb', total_price: 387.40, items_found: 8, missing: [] },
    { chain: 'Сільпо', chain_slug: 'silpo', total_price: 421.80, items_found: 8, missing: [] },
    { chain: 'Ашан', chain_slug: 'auchan', total_price: 445.20, items_found: 7, missing: ['Хліб Дарницький'] },
];

const CHAIN_COLORS = {
    atb: '#e53e3e',
    silpo: '#ff6f00',
    auchan: '#2e7d32',
};
const CHAIN_ICONS = { atb: '🛒', silpo: '🌿', auchan: '🏪' };

export default function CompareCartScreen({ navigation }) {
    const { items, totalItems } = useCart();
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState([]);
    const [totalRequested, setTotalRequested] = useState(0);
    const [isDemo, setIsDemo] = useState(false);

    useEffect(() => { fetchComparison(); }, []);

    const fetchComparison = async () => {
        if (items.length === 0) {
            setResults(DEMO_RESULTS);
            setTotalRequested(8);
            setIsDemo(true);
            setLoading(false);
            return;
        }

        try {
            let lat = null, lon = null;
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    lat = loc.coords.latitude;
                    lon = loc.coords.longitude;
                }
            } catch (_) {}

            const payload = {
                items: items.map(item => ({ product_id: item.productId, quantity: item.quantity })),
                lat, lon, radius: 5.0,
            };

            const response = await api.post('/compare-cart/', payload);
            const fetched = response?.results || response?.data?.results || [];
            if (fetched.length > 0) {
                setResults(fetched);
                setTotalRequested(response?.total_requested || response?.data?.total_requested || items.length);
                setIsDemo(false);
            } else {
                // API returned empty — show demo
                setResults(DEMO_RESULTS);
                setTotalRequested(8);
                setIsDemo(true);
            }
        } catch (error) {
            console.warn('Compare cart error, using demo:', error.message);
            setResults(DEMO_RESULTS);
            setTotalRequested(8);
            setIsDemo(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePurchase = async () => {
        if (isDemo) {
            Alert.alert('Demo режим', 'Додайте товари до кошика для реального порівняння та збереження покупки.');
            return;
        }
        try {
            setLoading(true);
            const best = results[0];
            const maxPrice = Math.max(...results.map(r => r.total_price));
            const payload = {
                chain_name: best.chain,
                chain_slug: best.chain_slug || best.chain.toLowerCase(),
                total_price: best.total_price,
                saved_amount: Math.max(0, maxPrice - best.total_price),
                items_count: best.items_found,
            };
            await api.post('/analytics/user/', payload);
            Alert.alert('Успіх', 'Покупка збережена в аналітиці!');
            navigation.navigate(ROUTES.ANALYTICS);
        } catch (e) {
            Alert.alert('Помилка', 'Не вдалося зберегти покупку.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Порівнюємо ціни по всім мережам...</Text>
            </View>
        );
    }

    const best = results[0];
    const maxPrice = Math.max(...results.map(r => r.total_price));

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>

                {isDemo && (
                    <View style={styles.demoBanner}>
                        <Icon name="information-circle-outline" size={18} color={COLORS.warning} />
                        <Text style={styles.demoBannerText}>Demo дані • Додайте товари до кошика для реального порівняння</Text>
                    </View>
                )}

                {/* Winner card */}
                <LinearGradient
                    colors={['rgba(16,185,129,0.15)', 'rgba(16,185,129,0.05)']}
                    style={styles.winnerCard}
                >
                    <Icon name="trophy" size={36} color={COLORS.accent} />
                    <Text style={styles.winnerLabel}>Найкращий вибір</Text>
                    <Text style={styles.winnerChain}>{CHAIN_ICONS[best.chain_slug] || '🏪'} {best.chain}</Text>
                    <Text style={styles.winnerPrice}>{best.total_price.toFixed(2)} ₴</Text>
                    <Text style={styles.winnerSub}>
                        Знайдено {best.items_found} з {totalRequested} товарів
                    </Text>
                    {maxPrice > best.total_price && (
                        <View style={styles.savingsBadge}>
                            <Text style={styles.savingsText}>
                                Економія до {(maxPrice - best.total_price).toFixed(2)} ₴
                            </Text>
                        </View>
                    )}
                </LinearGradient>

                <Text style={styles.sectionTitle}>Всі мережі</Text>

                {results.map((res, idx) => {
                    const diff = res.total_price - best.total_price;
                    const coveragePct = Math.round((res.items_found / totalRequested) * 100);
                    return (
                        <View key={idx} style={[styles.resultCard, idx === 0 && styles.resultCardWinner]}>
                            <View style={styles.resultHeader}>
                                <View style={styles.resultLeft}>
                                    <Text style={styles.resultIcon}>{CHAIN_ICONS[res.chain_slug] || '🏪'}</Text>
                                    <View>
                                        <Text style={styles.resultChain}>{res.chain}</Text>
                                        <Text style={styles.resultCoverage}>{coveragePct}% товарів</Text>
                                    </View>
                                </View>
                                <View style={styles.resultRight}>
                                    <Text style={styles.resultPrice}>{res.total_price.toFixed(2)} ₴</Text>
                                    {idx > 0 && (
                                        <Text style={styles.resultDiff}>+{diff.toFixed(2)} ₴</Text>
                                    )}
                                    {idx === 0 && (
                                        <View style={styles.bestTag}>
                                            <Text style={styles.bestTagText}>✓ Найкраще</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Coverage bar */}
                            <View style={styles.coverageBar}>
                                <View style={[styles.coverageFill, {
                                    width: `${coveragePct}%`,
                                    backgroundColor: idx === 0 ? COLORS.accent : COLORS.primaryLight,
                                }]} />
                            </View>

                            {res.missing && res.missing.length > 0 && (
                                <Text style={styles.missingText}>
                                    Відсутні: {res.missing.slice(0, 2).join(', ')}{res.missing.length > 2 ? `...+${res.missing.length - 2}` : ''}
                                </Text>
                            )}
                        </View>
                    );
                })}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSavePurchase} activeOpacity={0.85}>
                    <LinearGradient colors={[COLORS.primary, COLORS.primaryLight || '#38bdf8']} style={styles.saveBtnGrad}>
                        <Icon name="checkmark-circle-outline" size={20} color="#fff" />
                        <Text style={styles.saveBtnText}>
                            {isDemo ? 'Демо режим' : `Зберегти покупку (${best.total_price.toFixed(2)} ₴)`}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgPrimary },
    center: { justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
    loadingText: { ...FONTS.medium, marginTop: SPACING.md, color: COLORS.textSecondary },

    demoBanner: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderRadius: RADIUS.md, padding: SPACING.sm,
        borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)',
        marginBottom: SPACING.md,
    },
    demoBannerText: { ...FONTS.caption, color: COLORS.warning, flex: 1, fontSize: 12 },

    winnerCard: {
        alignItems: 'center', borderRadius: RADIUS.xl,
        padding: SPACING.xl, marginBottom: SPACING.lg,
        borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    },
    winnerLabel: { ...FONTS.medium, color: COLORS.textSecondary, marginTop: SPACING.sm, fontSize: 13 },
    winnerChain: { ...FONTS.bold, fontSize: 26, color: COLORS.textPrimary, marginVertical: 4 },
    winnerPrice: { ...FONTS.price, fontSize: 38, color: COLORS.accent },
    winnerSub: { ...FONTS.caption, marginTop: 4 },
    savingsBadge: {
        marginTop: SPACING.sm, backgroundColor: 'rgba(16,185,129,0.2)',
        borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 4,
    },
    savingsText: { ...FONTS.bold, color: COLORS.accent, fontSize: 13 },

    sectionTitle: { ...FONTS.title, fontSize: 18, marginBottom: SPACING.md },

    resultCard: {
        backgroundColor: COLORS.bgCard, padding: SPACING.md,
        borderRadius: RADIUS.md, marginBottom: SPACING.sm,
        borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    resultCardWinner: {
        borderColor: COLORS.accent,
        backgroundColor: 'rgba(16,185,129,0.05)',
    },
    resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resultLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    resultIcon: { fontSize: 24 },
    resultChain: { ...FONTS.bold, fontSize: 16 },
    resultCoverage: { ...FONTS.caption, fontSize: 11, marginTop: 1 },
    resultRight: { alignItems: 'flex-end' },
    resultPrice: { ...FONTS.price, fontSize: 20 },
    resultDiff: { ...FONTS.medium, fontSize: 12, color: COLORS.error, marginTop: 2 },
    bestTag: {
        backgroundColor: 'rgba(16,185,129,0.2)',
        borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2,
    },
    bestTagText: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },

    coverageBar: {
        height: 4, backgroundColor: COLORS.surface,
        borderRadius: 2, marginTop: SPACING.sm, overflow: 'hidden',
    },
    coverageFill: { height: '100%', borderRadius: 2 },
    missingText: { ...FONTS.caption, color: COLORS.warning, marginTop: SPACING.xs, fontSize: 11 },

    footer: {
        padding: SPACING.lg,
        backgroundColor: COLORS.bgCard,
        borderTopWidth: 1, borderColor: COLORS.glassBorder,
    },
    saveBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
    saveBtnGrad: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: SPACING.sm, padding: SPACING.md,
    },
    saveBtnText: { ...FONTS.bold, color: '#fff', fontSize: 16 },
});
