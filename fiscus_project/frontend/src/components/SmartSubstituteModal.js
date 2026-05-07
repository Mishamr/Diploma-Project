/**
 * SmartSubstituteModal — модалка розумної заміни товару в кошику.
 * Показує поточний товар VS дешевший аналог з тієї ж категорії.
 * Кнопки: Замінити / ⇄ Вибрати інший / Залишити
 */

import React, { useEffect, useState, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    Animated,
    ScrollView,
    Dimensions,
} from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import apiClient from '../api/client';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Картка товару ─────────────────────────────────────────────────────────────
function ProductMiniCard({ product, price, label, labelColor, isDiscount }) {
    const [imgError, setImgError] = useState(false);
    return (
        <View style={[styles.miniCard, isDiscount && styles.miniCardDiscount]}>
            {isDiscount && (
                <View style={styles.discountTag}>
                    <Text style={styles.discountTagText}>Дешевше</Text>
                </View>
            )}
            <View style={styles.miniCardImg}>
                {product?.image_url && !imgError ? (
                    <Image
                        source={{ uri: product.image_url }}
                        style={styles.imgFull}
                        resizeMode="cover"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <Icon name="cube-outline" size={32} color={COLORS.textMuted} />
                )}
            </View>
            <Text style={styles.miniCardLabel}>{label}</Text>
            <Text style={styles.miniCardName} numberOfLines={3}>
                {product?.name || '—'}
            </Text>
            {product?.brand && (
                <Text style={styles.miniCardBrand}>{product.brand}</Text>
            )}
            <Text style={[styles.miniCardPrice, isDiscount && styles.miniCardPriceDiscount]}>
                {price?.toFixed(2)} ₴
            </Text>
        </View>
    );
}

// ── Головний компонент ────────────────────────────────────────────────────────
export default function SmartSubstituteModal({
    visible,
    cartItem,          // поточний товар з кошика
    onReplace,         // fn(newProduct) — замінити
    onChooseOther,     // fn(categorySlug, categoryName) — вибрати інший
    onSkip,            // fn() — залишити / пропустити
    onClose,           // fn() — закрити всю сесію
}) {
    const [loading, setLoading] = useState(false);
    const [alternative, setAlternative] = useState(null);
    const [allAlternatives, setAllAlternatives] = useState([]);
    const [savings, setSavings] = useState(0);
    const [notFound, setNotFound] = useState(false);

    const slideAnim = useRef(new Animated.Value(300)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible && cartItem) {
            setAlternative(null);
            setAllAlternatives([]);
            setNotFound(false);
            setLoading(true);
            fetchCheaperAlternative();
            // Animate in
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [visible, cartItem?.productId]);

    const fetchCheaperAlternative = async () => {
        try {
            const productId = cartItem?.productId;
            const currentPrice = cartItem?.price || 0;

            if (!productId) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            // Use normalized_name-based alternatives endpoint:
            // Finds products with SAME normalized_name (true product equivalents)
            // e.g. "молоко 2.5%" → only other milks, not "молочний батончик"
            const results = await apiClient.getProductAlternatives(productId, currentPrice);

            const alternatives = Array.isArray(results) ? results : [];

            if (alternatives.length === 0) {
                setNotFound(true);
            } else {
                // Already sorted by price asc from backend
                const best = alternatives[0];
                setAlternative(best);
                setSavings(currentPrice - (best.latest_price || best.price || 0));
                // Store all alternatives for "вибрати інший" picker
                setAllAlternatives(alternatives);
            }
        } catch (e) {
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    };

    const handleReplace = () => {
        if (!alternative) return;
        onReplace({
            productId: alternative.id,
            name: alternative.name,
            price: alternative.latest_price || alternative.price || 0,
            image_url: alternative.image_url,
            category_slug: alternative.category_slug || cartItem?.category_slug,
            categorySlug: alternative.category_slug || cartItem?.category_slug,
            brand: alternative.brand,
        });
    };

    const handleChooseOther = () => {
        // Pass the already-loaded alternatives list to the picker
        // so no second API call is needed
        onChooseOther({
            alternatives: allAlternatives,
            oldProductId: cartItem?.productId,
            oldProductName: cartItem?.name,
            currentPrice: cartItem?.price || 0,
        });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={onClose} />
                <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }], opacity: opacityAnim }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Icon name="swap-horizontal" size={20} color={COLORS.primary} />
                            <Text style={styles.headerTitle}>Розумна заміна</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={12}>
                            <Icon name="close" size={22} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
                        {loading ? (
                            <View style={styles.loadingBlock}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                                <Text style={styles.loadingText}>Шукаємо дешевший аналог...</Text>
                            </View>
                        ) : notFound ? (
                            <View style={styles.notFoundBlock}>
                                <Icon name="checkmark-circle" size={48} color={COLORS.accent} />
                                <Text style={styles.notFoundTitle}>Ціна вже оптимальна!</Text>
                                <Text style={styles.notFoundSub}>
                                    Дешевшого аналогу в тій же категорії не знайдено.
                                </Text>
                                <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
                                    <Text style={styles.skipBtnText}>Перейти до наступного</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                {/* Savings banner */}
                                {savings > 0 && (
                                    <View style={styles.savingsBanner}>
                                        <Icon name="trending-down" size={16} color={COLORS.accent} />
                                        <Text style={styles.savingsBannerText}>
                                            Економія {savings.toFixed(2)} ₴ на одиницю
                                        </Text>
                                    </View>
                                )}

                                {/* Two product cards */}
                                <View style={styles.cardsRow}>
                                    <ProductMiniCard
                                        product={{
                                            name: cartItem?.name,
                                            image_url: cartItem?.image_url,
                                            brand: cartItem?.brand,
                                        }}
                                        price={cartItem?.price}
                                        label="Зараз у кошику"
                                        isDiscount={false}
                                    />

                                    {/* Arrow */}
                                    <View style={styles.arrowCircle}>
                                        <Icon name="swap-horizontal" size={20} color={COLORS.primary} />
                                    </View>

                                    <ProductMiniCard
                                        product={alternative}
                                        price={alternative?.latest_price || alternative?.price}
                                        label="Дешевша заміна"
                                        isDiscount={true}
                                    />
                                </View>

                                {/* Actions */}
                                <View style={styles.actions}>
                                    {/* Replace */}
                                    <TouchableOpacity style={styles.replaceBtn} onPress={handleReplace} activeOpacity={0.85}>
                                        <Icon name="swap-horizontal" size={18} color="#fff" />
                                        <Text style={styles.replaceBtnText}>
                                            Замінити (-{savings.toFixed(2)} ₴)
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Choose other — ⇄ icon */}
                                    <TouchableOpacity style={styles.otherBtn} onPress={handleChooseOther} activeOpacity={0.85}>
                                        <View style={styles.otherBtnIcon}>
                                            <Icon name="refresh" size={18} color={COLORS.primary} />
                                        </View>
                                        <Text style={styles.otherBtnText}>Вибрати інший</Text>
                                    </TouchableOpacity>

                                    {/* Skip */}
                                    <TouchableOpacity style={styles.leaveBtn} onPress={onSkip} activeOpacity={0.8}>
                                        <Text style={styles.leaveBtnText}>Залишити як є</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    overlayBg: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        backgroundColor: COLORS.bgCard || '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 32,
        maxHeight: '90%',
        ...SHADOWS.card,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border || '#eee',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    headerTitle: { ...FONTS.bold, fontSize: 17, color: COLORS.textPrimary },
    body: { padding: SPACING.lg, paddingBottom: 8 },

    loadingBlock: { alignItems: 'center', paddingVertical: SPACING.xxl },
    loadingText: { ...FONTS.medium, color: COLORS.textSecondary, marginTop: SPACING.md },

    notFoundBlock: { alignItems: 'center', paddingVertical: SPACING.xl },
    notFoundTitle: { ...FONTS.bold, fontSize: 18, color: COLORS.textPrimary, marginTop: SPACING.md },
    notFoundSub: { ...FONTS.caption, textAlign: 'center', marginTop: SPACING.xs },
    skipBtn: {
        marginTop: SPACING.lg,
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full,
    },
    skipBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    savingsBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: 'rgba(16,185,129,0.12)',
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: 'rgba(16,185,129,0.25)',
    },
    savingsBannerText: { ...FONTS.bold, color: COLORS.accent || '#10b981', fontSize: 14 },

    cardsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 0,
        marginBottom: SPACING.lg,
    },
    miniCard: {
        flex: 1,
        backgroundColor: COLORS.bgPrimary || '#f8f9fa',
        borderRadius: RADIUS.lg || 16,
        padding: SPACING.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border || '#eee',
        minHeight: 180,
    },
    miniCardDiscount: {
        borderColor: COLORS.accent || '#10b981',
        backgroundColor: 'rgba(16,185,129,0.05)',
    },
    discountTag: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: COLORS.accent || '#10b981',
        borderRadius: RADIUS.full,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    discountTagText: { color: '#fff', fontSize: 9, fontWeight: '800' },
    miniCardImg: {
        width: 64,
        height: 64,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.bgSecondary || '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        marginBottom: SPACING.sm,
    },
    imgFull: { width: 64, height: 64 },
    miniCardLabel: { ...FONTS.caption, fontSize: 10, color: COLORS.textMuted, marginBottom: 2 },
    miniCardName: { ...FONTS.medium, fontSize: 12, textAlign: 'center', lineHeight: 16 },
    miniCardBrand: { ...FONTS.caption, fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
    miniCardPrice: { ...FONTS.price, fontSize: 18, marginTop: SPACING.sm, color: COLORS.textPrimary },
    miniCardPriceDiscount: { color: COLORS.accent || '#10b981' },

    arrowCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(139,92,246,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: 'rgba(139,92,246,0.25)',
    },

    actions: { gap: SPACING.sm },

    replaceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.primary || '#8b5cf6',
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.md,
    },
    replaceBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    otherBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        borderWidth: 1.5,
        borderColor: COLORS.primary || '#8b5cf6',
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.md - 1,
    },
    otherBtnIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(139,92,246,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    otherBtnText: { color: COLORS.primary || '#8b5cf6', fontWeight: '700', fontSize: 15 },

    leaveBtn: {
        alignItems: 'center',
        paddingVertical: SPACING.sm,
    },
    leaveBtnText: { ...FONTS.medium, color: COLORS.textMuted, fontSize: 14 },
});
