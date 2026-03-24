import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import { useCart } from '../context/CartContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import api from '../api/client';
import ROUTES from '../constants/routes';

export default function CompareCartScreen({ navigation }) {
    const { items, totalItems } = useCart();
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState([]);
    const [totalRequested, setTotalRequested] = useState(0);

    useEffect(() => {
        fetchComparison();
    }, []);

    const fetchComparison = async () => {
        if (items.length === 0) {
            setLoading(false);
            return;
        }

        try {
            const payload = {
                items: items.map(item => ({
                    product_id: item.productId,
                    quantity: item.quantity
                }))
            };

            const response = await api.post('/compare-cart/', payload);
            if (response.data) {
                setResults(response.data.results || []);
                setTotalRequested(response.data.total_requested || 0);
            }
        } catch (error) {
            console.error('Failed to compare cart:', error);
            Alert.alert('Помилка', 'Не вдалося завантажити порівняння. Можливо бекенд недоступний.');
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

    if (results.length === 0) {
        return (
            <View style={[styles.container, styles.center]}>
                <Icon name="basket-outline" size={64} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>Немає даних для порівняння</Text>
            </View>
        );
    }

    const bestChain = results[0];

    const handleSavePurchase = async () => {
        try {
            setLoading(true);
            const maxPrice = Math.max(...results.map(r => r.total_price));
            const savedAmount = maxPrice - bestChain.total_price;

            const payload = {
                chain_name: bestChain.chain,
                chain_slug: bestChain.chain.toLowerCase(),
                total_price: bestChain.total_price,
                saved_amount: savedAmount > 0 ? savedAmount : 0,
                items_count: bestChain.items_found,
            };

            const response = await api.post('/analytics/user/', payload);
            if (response.data && response.data.status === 'ok') {
                Alert.alert('Успіх', 'Покупка збережена в аналітиці!');
                navigation.navigate(ROUTES.ANALYTICS);
            }
        } catch (error) {
            console.error('Failed to save purchase:', error);
            Alert.alert('Помилка', 'Не вдалося зберегти покупку.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
        <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
            <View style={styles.header}>
                <Icon name="trophy-outline" size={32} color={COLORS.accent} />
                <Text style={styles.headerTitle}>Найкращий вибір:</Text>
                <Text style={styles.bestChainName}>{bestChain.chain}</Text>
                <Text style={styles.bestTotal}>{bestChain.total_price.toFixed(2)} ₴</Text>
                <Text style={styles.itemsFoundText}>
                    Знайдено {bestChain.items_found} з {totalRequested} товарів
                </Text>
            </View>

            <Text style={styles.sectionTitle}>Всі мережі:</Text>

            {results.map((res, idx) => (
                <View key={idx} style={[styles.resultCard, idx === 0 && styles.winnerCard]}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.chainName}>{res.chain}</Text>
                        <Text style={styles.chainTotal}>{res.total_price.toFixed(2)} ₴</Text>
                    </View>

                    <View style={styles.cardInfo}>
                        <Text style={styles.infoText}>
                            <Icon name="checkmark-circle-outline" size={14} color={COLORS.success} /> {res.items_found} товарів
                        </Text>
                        {res.missing && res.missing.length > 0 && (
                            <Text style={styles.missingText}>
                                Відсутні: {res.missing.length} ({res.missing.slice(0, 2).join(', ')}{res.missing.length > 2 ? '...' : ''})
                            </Text>
                        )}
                    </View>

                    {idx > 0 && (
                        <Text style={styles.diffText}>
                            +{(res.total_price - bestChain.total_price).toFixed(2)} ₴ дорожче
                        </Text>
                    )}
                </View>
            ))}
        </ScrollView>

        <View style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSavePurchase}>
                <Text style={styles.saveBtnText}>Зберегти покупку ({bestChain.total_price.toFixed(2)} ₴)</Text>
            </TouchableOpacity>
        </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgPrimary,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    loadingText: {
        ...FONTS.medium,
        marginTop: SPACING.md,
        color: COLORS.textSecondary,
    },
    emptyTitle: {
        ...FONTS.subtitle,
        marginTop: SPACING.md,
        color: COLORS.textSecondary,
    },
    header: {
        alignItems: 'center',
        backgroundColor: COLORS.bgCard,
        padding: SPACING.xl,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        marginBottom: SPACING.xl,
        ...SHADOWS.card,
    },
    headerTitle: {
        ...FONTS.medium,
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: SPACING.sm,
    },
    bestChainName: {
        ...FONTS.bold,
        fontSize: 24,
        color: COLORS.textPrimary,
        marginVertical: 4,
    },
    bestTotal: {
        ...FONTS.price,
        fontSize: 32,
        color: COLORS.primary,
    },
    itemsFoundText: {
        ...FONTS.caption,
        marginTop: SPACING.xs,
    },
    sectionTitle: {
        ...FONTS.title,
        fontSize: 18,
        marginBottom: SPACING.md,
    },
    resultCard: {
        backgroundColor: COLORS.bgCard,
        padding: SPACING.lg,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        marginBottom: SPACING.sm,
    },
    winnerCard: {
        borderColor: COLORS.primaryLight,
        backgroundColor: 'rgba(56, 189, 248, 0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    chainName: {
        ...FONTS.bold,
        fontSize: 16,
    },
    chainTotal: {
        ...FONTS.price,
        fontSize: 18,
    },
    cardInfo: {
        marginTop: SPACING.xs,
    },
    infoText: {
        ...FONTS.caption,
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    missingText: {
        ...FONTS.caption,
        fontSize: 12,
        color: COLORS.warning,
        marginTop: 4,
    },
    diffText: {
        ...FONTS.medium,
        fontSize: 13,
        color: COLORS.error,
        marginTop: SPACING.sm,
        textAlign: 'right',
    },
    footer: {
        padding: SPACING.lg,
        backgroundColor: COLORS.bgCard,
        borderTopWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    saveBtn: {
        backgroundColor: COLORS.primary,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    },
    saveBtnText: {
        ...FONTS.bold,
        color: '#fff',
        fontSize: 16,
    },
});
