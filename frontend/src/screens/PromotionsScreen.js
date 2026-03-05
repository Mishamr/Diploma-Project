/**
 * Promotions screen вЂ” sales with product images and names.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import { usePromotionStore } from '../stores';
import { useCart } from '../context/CartContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { CHAINS, getChainName, getChainColor } from '../constants/stores';
import StoreChip from '../components/StoreChip';

export default function PromotionsScreen() {
    const { promotions, loading, fetchPromotions } = usePromotionStore();
    const { addItem } = useCart();
    const [selectedChain, setSelectedChain] = useState(null);

    useEffect(() => { fetchPromotions(30, selectedChain); }, [selectedChain]);

    const allChains = [{ slug: null, name: 'РЈСЃС–', icon: 'рџ”Ґ' }, ...CHAINS];

    const renderPromo = ({ item }) => {
        const discount = item.old_price ? Math.round((1 - item.price / item.old_price) * 100) : 0;
        const productName = item.product_name || item.name || item.title || 'РўРѕРІР°СЂ';
        const imageUrl = item.image_url;

        return (
            <View style={styles.card}>
                {/* Product image */}
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
                ) : (
                    <View style={[styles.image, styles.imagePlaceholder]}>
                        <Icon name="cube-outline" size={24} color={COLORS.textMuted} />
                    </View>
                )}

                {/* Info */}
                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={2}>{productName}</Text>
                    <View style={styles.chainRow}>
                        <View style={[styles.dot, { backgroundColor: getChainColor(item.chain_slug) }]} />
                        <Text style={styles.chainLabel}>{item.chain || getChainName(item.chain_slug)}</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>{item.price?.toFixed(2)} в‚ґ</Text>
                        {item.old_price && <Text style={styles.oldPrice}>{item.old_price.toFixed(2)} в‚ґ</Text>}
                    </View>
                </View>

                {/* Right side: discount + cart */}
                <View style={styles.actions}>
                    {discount > 0 && (
                        <LinearGradient colors={COLORS.gradientPromo} style={styles.badge}>
                            <Text style={styles.badgeText}>-{discount}%</Text>
                        </LinearGradient>
                    )}
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => addItem({ productId: item.id, name: productName, price: item.price })}
                    >
                        <Icon name="cart-outline" size={22} color={COLORS.accent} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#fbbf24', '#d97706', '#92400e']} style={styles.header}>
                <Icon name="pricetag" size={24} color="#fff" />
                <Text style={styles.headerTitle}>РўРѕРї Р°РєС†С–С—</Text>
            </LinearGradient>

            <FlatList
                horizontal
                data={allChains}
                renderItem={({ item: c }) => (
                    <StoreChip
                        chain={c}
                        selected={selectedChain === c.slug}
                        onPress={() => setSelectedChain(c.slug)}
                    />
                )}
                keyExtractor={c => c.slug || 'all'}
                showsHorizontalScrollIndicator={false}
                style={styles.chips}
                contentContainerStyle={{ paddingHorizontal: SPACING.md, alignItems: 'center' }}
            />

            {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
                <FlatList
                    data={promotions}
                    renderItem={renderPromo}
                    keyExtractor={(i, idx) => `${i.id || idx}`}
                    contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: 40 }}
                    ListEmptyComponent={<Text style={styles.empty}>РђРєС†С–С— РЅРµ Р·РЅР°Р№РґРµРЅРѕ</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgPrimary },
    header: {
        paddingVertical: SPACING.md,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.sm,
    },
    headerTitle: { ...FONTS.subtitle, color: '#fff' },
    chips: {
        marginVertical: SPACING.sm,
        maxHeight: 40,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.glass,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    image: {
        width: 56,
        height: 56,
        borderRadius: RADIUS.sm,
    },
    imagePlaceholder: {
        backgroundColor: COLORS.glassLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        flex: 1,
        marginLeft: SPACING.sm,
    },
    name: {
        ...FONTS.medium,
        fontSize: 13,
        lineHeight: 18,
    },
    chainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
    },
    dot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
    chainLabel: { ...FONTS.caption, fontSize: 11 },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
        gap: 6,
    },
    price: { ...FONTS.price, fontSize: 15 },
    oldPrice: { ...FONTS.priceOld, fontSize: 12 },
    actions: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginLeft: SPACING.xs,
        gap: SPACING.xs,
    },
    badge: {
        borderRadius: RADIUS.sm,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    badgeText: { color: '#fff', fontWeight: '800', fontSize: 11 },
    addBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    empty: { ...FONTS.caption, textAlign: 'center', marginTop: 60, fontSize: 15 },
});

