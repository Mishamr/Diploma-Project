/**
 * Shopping List / Calculator screen — з розумною заміною, улюбленими та історією кошиків.
 */

import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Image,
    Animated,
} from 'react-native';
import { useCart } from '../context/CartContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import Icon from '../components/Icon';
import SmartSubstituteModal from '../components/SmartSubstituteModal';
import ROUTES from '../constants/routes';

export default function ShoppingListScreen({ navigation }) {
    const {
        items, totalItems, totalPrice,
        removeItem, updateQuantity, clearCart,
        replaceItem, saveCartToHistory,
    } = useCart();

    const originalTotal = items.reduce((sum, i) => sum + (i.price || 0) * 1.15 * i.quantity, 0);
    const savings = originalTotal - totalPrice;

    // ── Smart Substitute state ────────────────────────────────────────────────
    const [substituteVisible, setSubstituteVisible] = useState(false);
    const [substituteQueue, setSubstituteQueue] = useState([]); // items to process
    const [currentSubstIdx, setCurrentSubstIdx] = useState(0);

    const currentCartItem = substituteQueue[currentSubstIdx] || null;

    const handleStartSmartReplace = () => {
        if (items.length === 0) return;
        const queue = items.filter((i) => !!i.category_slug || !!i.categorySlug);
        if (queue.length === 0) {
            Alert.alert(
                'Не вдається знайти категорії',
                'Товари в кошику не мають інформації про категорію. Спробуйте додати товари через каталог.'
            );
            return;
        }
        setSubstituteQueue(queue);
        setCurrentSubstIdx(0);
        setSubstituteVisible(true);
    };

    const advanceOrClose = () => {
        const next = currentSubstIdx + 1;
        if (next < substituteQueue.length) {
            setCurrentSubstIdx(next);
        } else {
            setSubstituteVisible(false);
            setSubstituteQueue([]);
            setCurrentSubstIdx(0);
        }
    };

    const handleReplace = (newProduct) => {
        if (currentCartItem) {
            replaceItem(currentCartItem.productId, newProduct);
        }
        advanceOrClose();
    };

    const handleChooseOther = ({ alternatives, oldProductId, oldProductName, currentPrice }) => {
        setSubstituteVisible(false);
        navigation.navigate(ROUTES.CATEGORY_PRODUCT_PICKER, {
            // Pass preloaded alternatives list — no extra API call needed
            preloadedProducts: alternatives,
            oldProductId,
            oldProductName,
            currentPrice,
            // Title for header
            categoryName: `Замінники для «${oldProductName}»`,
        });
    };

    // ── Save cart ─────────────────────────────────────────────────────────────
    const handleSaveCart = async () => {
        const ok = await saveCartToHistory();
        if (ok) {
            Alert.alert('Збережено', 'Кошик збережено в історію!', [
                { text: 'OK' },
                {
                    text: 'Переглянути',
                    onPress: () => navigation.navigate(ROUTES.CART_HISTORY),
                },
            ]);
        }
    };

    // ── Clear ─────────────────────────────────────────────────────────────────
    const handleClear = () => {
        Alert.alert('Очистити кошик?', 'Всі товари будуть видалені.', [
            { text: 'Скасувати', style: 'cancel' },
            { text: 'Очистити', style: 'destructive', onPress: clearCart },
        ]);
    };

    const renderItem = ({ item }) => (
        <GlassCard style={styles.itemCard}>
            {/* Thumbnail */}
            <View style={styles.itemThumb}>
                {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.thumbImg} />
                ) : (
                    <Text style={styles.thumbEmoji}>📦</Text>
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
                        <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                        onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                        style={styles.qtyBtn}
                    >
                        <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.itemTotal}>
                    {((item.price || 0) * item.quantity).toFixed(2)} ₴
                </Text>
            </View>

            {/* Delete */}
            <TouchableOpacity style={styles.deleteBtn} onPress={() => removeItem(item.productId)}>
                <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
        </GlassCard>
    );

    return (
        <View style={styles.container}>
            {/* Summary header */}
            <View style={styles.summaryBar}>
                <View>
                    <Text style={styles.summaryLabel}>Калькулятор кошика</Text>
                    <Text style={styles.summaryCount}>{totalItems} товарів</Text>
                </View>
                <View style={styles.headerActions}>
                    {totalItems > 0 && (
                        <>
                            {/* History */}
                            <TouchableOpacity
                                style={styles.iconBtn}
                                onPress={() => navigation?.navigate(ROUTES.CART_HISTORY)}
                            >
                                <Icon name="time-outline" size={18} color={COLORS.primary} />
                            </TouchableOpacity>
                            {/* Clear */}
                            <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                                <Text style={styles.clearText}>Очистити</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            {/* Items */}
            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => String(item.productId)}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={styles.emptyBar} />
                        <Text style={styles.emptyTitle}>Кошик порожній</Text>
                        <Text style={styles.emptySubtitle}>Додайте товари з каталогу або акцій</Text>
                    </View>
                }
            />

            {/* Bottom bar */}
            {totalItems > 0 && (
                <View style={styles.bottomBar}>
                    {savings > 0 && (
                        <View style={styles.savingsRow}>
                            <Text style={styles.savingsText}>↓ Економія: {savings.toFixed(2)} ₴</Text>
                        </View>
                    )}
                    <View style={styles.totalRow}>
                        <View>
                            <Text style={styles.totalLabel}>До сплати:</Text>
                            <Text style={styles.totalValue}>{totalPrice.toFixed(2)} ₴</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.compareBtn}
                            onPress={() => navigation?.navigate(ROUTES.COMPARE_CART)}
                        >
                            <Text style={styles.compareBtnText}>✦ Порівняти</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Action row: Smart replace + Save */}
                    <View style={styles.actionRow}>
                        {/* Smart substitute button — ⇄ icon */}
                        <TouchableOpacity
                            style={styles.smartBtn}
                            onPress={handleStartSmartReplace}
                            activeOpacity={0.85}
                        >
                            <Icon name="swap-horizontal" size={17} color={COLORS.primary} />
                            <Text style={styles.smartBtnText}>Розумна заміна</Text>
                        </TouchableOpacity>

                        {/* Save to history */}
                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={handleSaveCart}
                            activeOpacity={0.85}
                        >
                            <Icon name="bookmark-outline" size={17} color={COLORS.primary} />
                            <Text style={styles.saveBtnText}>Зберегти</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Smart Substitute Modal */}
            <SmartSubstituteModal
                visible={substituteVisible}
                cartItem={currentCartItem}
                onReplace={handleReplace}
                onChooseOther={handleChooseOther}
                onSkip={advanceOrClose}
                onClose={() => {
                    setSubstituteVisible(false);
                    setSubstituteQueue([]);
                    setCurrentSubstIdx(0);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgPrimary },

    summaryBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    summaryLabel: { ...FONTS.bold, fontSize: 17 },
    summaryCount: { ...FONTS.caption, marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.sm,
        backgroundColor: 'rgba(139,92,246,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(139,92,246,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearBtn: {
        backgroundColor: 'rgba(220,38,38,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(220,38,38,0.15)',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.full,
    },
    clearText: { color: COLORS.error, fontSize: 12, fontWeight: '600' },

    listContent: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.xxl * 5,
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
        backgroundColor: COLORS.bgSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    thumbImg: { width: 48, height: 48 },
    thumbEmoji: { fontSize: 22 },
    itemInfo: { flex: 1, marginLeft: SPACING.md },
    itemName: { ...FONTS.medium, fontSize: 13 },
    itemPriceUnit: { ...FONTS.caption, marginTop: 2, fontSize: 11 },

    quantitySection: { alignItems: 'center', marginLeft: SPACING.sm },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgSecondary,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    qtyBtn: { paddingHorizontal: 10, paddingVertical: 6 },
    qtyBtnText: { fontSize: 16, color: COLORS.primary, fontWeight: '700' },
    qtyText: { ...FONTS.bold, fontSize: 14, minWidth: 22, textAlign: 'center' },
    itemTotal: { ...FONTS.price, fontSize: 13, marginTop: 4 },

    deleteBtn: { padding: SPACING.sm, marginLeft: SPACING.xs },
    deleteBtnText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },

    emptyState: { alignItems: 'center', marginTop: SPACING.xxl * 2 },
    emptyBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: SPACING.sm },
    emptyTitle: { ...FONTS.subtitle, marginTop: SPACING.xs },
    emptySubtitle: { ...FONTS.caption, marginTop: SPACING.xs },

    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        ...SHADOWS.card,
    },
    savingsRow: {
        backgroundColor: 'rgba(5,150,105,0.08)',
        padding: SPACING.sm,
        borderRadius: RADIUS.sm,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: 'rgba(5,150,105,0.15)',
    },
    savingsText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { ...FONTS.caption, fontSize: 13 },
    totalValue: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
    compareBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm + 2,
        ...SHADOWS.button,
    },
    compareBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

    actionRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.sm,
    },
    smartBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.sm,
        backgroundColor: 'rgba(139,92,246,0.06)',
    },
    smartBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
    saveBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.sm,
        backgroundColor: 'rgba(139,92,246,0.06)',
    },
    saveBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
});
