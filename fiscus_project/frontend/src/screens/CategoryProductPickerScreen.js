/**
 * CategoryProductPickerScreen — вибір замінника з готового списку аналогів.
 *
 * Отримує preloadedProducts — список продуктів з тим самим normalized_name
 * що і поточний товар (справжні семантичні еквіваленти: молоко → молоко,
 * кока-кола → кока-кола від іншого бренду).
 * Ніякого пошуку по назві, ніякого пошуку по категорії.
 */

import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Image,
} from 'react-native';
import Icon from '../components/Icon';
import GlassCard from '../components/GlassCard';
import { useCart } from '../context/CartContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

function ProductImage({ uri, style }) {
    const [err, setErr] = useState(false);
    if (uri && !err) {
        return (
            <Image
                source={{ uri }}
                style={style}
                resizeMode="cover"
                onError={() => setErr(true)}
            />
        );
    }
    return (
        <View style={[style, styles.imgPlaceholder]}>
            <Icon name="cube-outline" size={24} color={COLORS.textMuted} />
        </View>
    );
}

export default function CategoryProductPickerScreen({ route, navigation }) {
    const {
        preloadedProducts = [],  // готовий список аналогів з normalized_name
        oldProductId,            // ID товару що замінюємо
        oldProductName,          // назва для відображення
        currentPrice = 0,        // поточна ціна для порівняння
        categoryName,            // заголовок екрану
    } = route.params || {};

    const { replaceItem } = useCart();

    const handleSelect = useCallback((product) => {
        const price = product.latest_price || product.price || 0;
        const saving = currentPrice > 0 && price < currentPrice
            ? ` (економія ${(currentPrice - price).toFixed(2)} ₴)`
            : price > currentPrice
                ? ` (+${(price - currentPrice).toFixed(2)} ₴)`
                : '';

        Alert.alert(
            'Замінити товар?',
            `«${oldProductName}»\n→ «${product.name}» — ${price.toFixed(2)} ₴${saving}`,
            [
                { text: 'Скасувати', style: 'cancel' },
                {
                    text: 'Замінити',
                    onPress: () => {
                        replaceItem(oldProductId, {
                            productId: product.id,
                            name: product.name,
                            price,
                            image_url: product.image_url,
                            brand: product.brand,
                            category_slug: product.category_slug,
                            categorySlug: product.category_slug,
                            category_name: product.category_name,
                        });
                        navigation.goBack();
                    },
                },
            ]
        );
    }, [oldProductId, oldProductName, currentPrice]);

    const renderItem = useCallback(({ item }) => {
        const price = item.latest_price || item.price || 0;
        const oldPrice = item.latest_old_price || item.old_price;
        const isPromo = oldPrice && oldPrice > price;
        const isCheaper = currentPrice > 0 && price < currentPrice;
        const isMoreExpensive = currentPrice > 0 && price > currentPrice;

        return (
            <GlassCard style={[styles.card, isCheaper && styles.cardCheaper]}>
                {isPromo && (
                    <View style={styles.promoBadge}>
                        <Text style={styles.promoText}>АКЦІЯ</Text>
                    </View>
                )}

                <ProductImage uri={item.image_url} style={styles.img} />

                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                    {item.brand && <Text style={styles.brand}>{item.brand}</Text>}
                    {item.weight && <Text style={styles.weight}>{item.weight}</Text>}
                    <View style={styles.priceRow}>
                        <Text style={[
                            styles.price,
                            isCheaper && styles.priceCheaper,
                            isMoreExpensive && styles.priceExpensive,
                        ]}>
                            {price.toFixed(2)} ₴
                        </Text>
                        {isPromo && (
                            <Text style={styles.oldPrice}>{Number(oldPrice).toFixed(2)} ₴</Text>
                        )}
                        {isCheaper && (
                            <View style={styles.savingBadge}>
                                <Text style={styles.savingBadgeText}>
                                    -{(currentPrice - price).toFixed(2)} ₴
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.selectBtn}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.85}
                >
                    <Icon name="swap-horizontal" size={20} color="#fff" />
                </TouchableOpacity>
            </GlassCard>
        );
    }, [currentPrice, handleSelect]);

    return (
        <View style={styles.container}>
            {/* Info banner — shows what we're replacing */}
            <View style={styles.banner}>
                <Icon name="swap-horizontal" size={16} color={COLORS.primary} />
                <Text style={styles.bannerText} numberOfLines={3}>
                    Замінюємо: <Text style={styles.bannerBold}>«{oldProductName}»</Text>
                    {currentPrice > 0 && (
                        <Text style={styles.bannerPrice}> ({currentPrice.toFixed(2)} ₴)</Text>
                    )}
                    {'\n'}
                    <Text style={styles.bannerSub}>
                        Показано {preloadedProducts.length} товар(и) того самого типу
                    </Text>
                </Text>
            </View>

            <FlatList
                data={preloadedProducts}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Icon name="checkmark-circle-outline" size={52} color={COLORS.accent} />
                        <Text style={styles.emptyTitle}>Аналогів не знайдено</Text>
                        <Text style={styles.emptyText}>
                            Цей товар вже є найдешевшим варіантом у своєму типі
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgPrimary },

    banner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.sm,
        backgroundColor: 'rgba(139,92,246,0.08)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(139,92,246,0.15)',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    bannerText: { ...FONTS.medium, fontSize: 13, flex: 1, lineHeight: 19 },
    bannerBold: { fontWeight: '700', color: COLORS.primary },
    bannerPrice: { color: COLORS.textMuted, fontWeight: '500' },
    bannerSub: { color: COLORS.textMuted, fontSize: 11, fontWeight: '400' },

    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: SPACING.xxl * 2,
        paddingHorizontal: SPACING.xl,
    },
    emptyTitle: { ...FONTS.subtitle, marginTop: SPACING.md, textAlign: 'center' },
    emptyText: { ...FONTS.caption, marginTop: SPACING.xs, textAlign: 'center' },

    list: {
        padding: SPACING.lg,
        paddingBottom: 40,
    },

    card: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        paddingVertical: SPACING.sm,
        position: 'relative',
    },
    cardCheaper: {
        borderColor: COLORS.accent,
        backgroundColor: 'rgba(16,185,129,0.04)',
    },
    promoBadge: {
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: COLORS.error,
        borderTopLeftRadius: RADIUS.md,
        borderBottomRightRadius: RADIUS.sm,
        paddingHorizontal: 6,
        paddingVertical: 2,
        zIndex: 1,
    },
    promoText: { color: '#fff', fontSize: 9, fontWeight: '800' },

    img: { width: 56, height: 56, borderRadius: RADIUS.sm },
    imgPlaceholder: {
        backgroundColor: COLORS.bgSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },

    info: { flex: 1, marginLeft: SPACING.md },
    name: { ...FONTS.medium, fontSize: 13, lineHeight: 18 },
    brand: { ...FONTS.caption, marginTop: 2 },
    weight: { ...FONTS.caption, color: COLORS.textDark, marginTop: 1 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: 4, flexWrap: 'wrap' },
    price: { ...FONTS.price, fontSize: 15 },
    priceCheaper: { color: COLORS.accent },
    priceExpensive: { color: COLORS.textSecondary },
    oldPrice: {
        fontSize: 12,
        color: COLORS.textMuted,
        textDecorationLine: 'line-through',
        fontWeight: '500',
    },
    savingBadge: {
        backgroundColor: 'rgba(16,185,129,0.15)',
        borderRadius: RADIUS.full,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: 'rgba(16,185,129,0.3)',
    },
    savingBadgeText: { color: COLORS.accent, fontSize: 10, fontWeight: '700' },

    selectBtn: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: SPACING.sm,
    },
});
