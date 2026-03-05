/**
 * Shopping List / Calculator screen — online store-style cart with totals.
 */

import React from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import { useCart } from '../context/CartContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import ROUTES from '../constants/routes';

export default function ShoppingListScreen({ navigation }) {
    const {
        items,
        totalItems,
        totalPrice,
        removeItem,
        updateQuantity,
        clearCart,
    } = useCart();

    // Mock original prices for savings display
    const originalTotal = items.reduce((sum, i) => sum + (i.price || 0) * 1.15 * i.quantity, 0);
    const savings = originalTotal - totalPrice;

    const handleClear = () => {
        Alert.alert(
            'Очистити кошик?',
            'Всі товари будуть видалені.',
            [
                { text: 'Скасувати', style: 'cancel' },
                { text: 'Очистити', style: 'destructive', onPress: clearCart },
            ]
        );
    };

    const renderItem = ({ item }) => (
        <GlassCard style={styles.itemCard}>
            {/* Product image placeholder */}
            <View style={styles.itemThumb}>
                {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.thumbImg} />
                ) : (
                    <Icon name="cube-outline" size={24} color={COLORS.textMuted} />
                )}
            </View>

            {/* Info */}
            <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.itemPriceUnit}>{(item.price || 0).toFixed(2)} ₴/шт</Text>
            </View>

            {/* Quantity stepper */}
            <View style={styles.quantitySection}>
                <View style={styles.quantityControls}>
                    <TouchableOpacity
                        onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                        style={styles.qtyBtn}
                    >
                        <Icon name="remove" size={16} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                        onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                        style={styles.qtyBtn}
                    >
                        <Icon name="add" size={16} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.itemTotal}>
                    {((item.price || 0) * item.quantity).toFixed(2)} ₴
                </Text>
            </View>

            {/* Delete */}
            <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => removeItem(item.productId)}
            >
                <Icon name="trash-outline" size={16} color={COLORS.error} />
            </TouchableOpacity>
        </GlassCard>
    );

    return (
        <View style={styles.container}>
            {/* Summary header */}
            <View style={styles.summaryBar}>
                <View>
                    <Text style={styles.summaryLabel}>🛒 Калькулятор кошика</Text>
                    <Text style={styles.summaryCount}>{totalItems} товарів</Text>
                </View>
                {totalItems > 0 && (
                    <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                        <Icon name="trash-outline" size={18} color={COLORS.error} />
                        <Text style={styles.clearText}>Очистити</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Items list */}
            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => String(item.productId)}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Icon name="calculator-outline" size={64} color={COLORS.textMuted} />
                        <Text style={styles.emptyTitle}>Кошик порожній</Text>
                        <Text style={styles.emptySubtitle}>
                            Додайте товари з каталогу або акцій
                        </Text>
                    </View>
                }
            />

            {/* Bottom totals bar — like online stores */}
            {totalItems > 0 && (
                <View style={styles.bottomBar}>
                    {/* Savings row */}
                    {savings > 0 && (
                        <View style={styles.savingsRow}>
                            <Icon name="trending-down" size={16} color={COLORS.accent} />
                            <Text style={styles.savingsText}>
                                Економія: {savings.toFixed(2)} ₴
                            </Text>
                        </View>
                    )}

                    <View style={styles.totalRow}>
                        <View>
                            <Text style={styles.totalLabel}>До сплати:</Text>
                            <Text style={styles.totalValue}>{totalPrice.toFixed(2)} ₴</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.compareBtn}
                            onPress={() => navigation?.navigate(ROUTES.AI_ASSISTANT)}
                        >
                            <LinearGradient
                                colors={COLORS.gradientAI}
                                style={styles.compareBtnInner}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Icon name="sparkles" size={18} color="#fff" />
                                <Text style={styles.compareBtnText}>Порівняти</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgPrimary,
    },
    summaryBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.bgSecondary,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.glassBorder,
    },
    summaryLabel: {
        ...FONTS.bold,
        fontSize: 17,
    },
    summaryCount: {
        ...FONTS.caption,
        marginTop: 2,
    },
    clearBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.full,
    },
    clearText: {
        color: COLORS.error,
        fontSize: 12,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.xxl * 3,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        paddingVertical: SPACING.sm,
    },
    itemThumb: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.glassLight,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    thumbImg: {
        width: 48,
        height: 48,
    },
    itemInfo: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    itemName: {
        ...FONTS.medium,
        fontSize: 13,
    },
    itemPriceUnit: {
        ...FONTS.caption,
        marginTop: 2,
        fontSize: 11,
    },
    quantitySection: {
        alignItems: 'center',
        marginLeft: SPACING.sm,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgInput,
        borderRadius: RADIUS.sm,
        paddingHorizontal: 2,
    },
    qtyBtn: {
        padding: 6,
    },
    qtyText: {
        ...FONTS.bold,
        fontSize: 14,
        minWidth: 22,
        textAlign: 'center',
    },
    itemTotal: {
        ...FONTS.price,
        fontSize: 13,
        marginTop: 4,
    },
    deleteBtn: {
        padding: SPACING.sm,
        marginLeft: SPACING.xs,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: SPACING.xxl * 2,
    },
    emptyTitle: {
        ...FONTS.subtitle,
        marginTop: SPACING.md,
    },
    emptySubtitle: {
        ...FONTS.caption,
        marginTop: SPACING.xs,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.bgSecondary,
        borderTopWidth: 1,
        borderTopColor: COLORS.glassBorder,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        ...SHADOWS.card,
    },
    savingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginBottom: SPACING.sm,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        padding: SPACING.sm,
        borderRadius: RADIUS.sm,
    },
    savingsText: {
        color: COLORS.accent,
        fontSize: 13,
        fontWeight: '600',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        ...FONTS.caption,
        fontSize: 13,
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    compareBtn: {
        borderRadius: RADIUS.md,
        overflow: 'hidden',
        ...SHADOWS.button,
    },
    compareBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm + 2,
        gap: SPACING.xs,
    },
    compareBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
});
