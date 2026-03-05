import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function ProductCard({ product, onPress, onAdd }) {
    const price = product.prices?.[0]?.price || product.price;
    const oldPrice = product.prices?.[0]?.old_price || product.old_price;
    const isPromo = oldPrice && oldPrice > price;

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
            {isPromo && (
                <View style={styles.promoBadge}>
                    <Text style={styles.promoText}>РђРљР¦Р†РЇ</Text>
                </View>
            )}
            {product.image_url ? (
                <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="cover" />
            ) : (
                <View style={[styles.image, styles.placeholder]}>
                    <Icon name="cube-outline" size={28} color={COLORS.textMuted} />
                </View>
            )}
            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
                {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
                <View style={styles.priceRow}>
                    <Text style={styles.price}>{price?.toFixed(2)} в‚ґ</Text>
                    {isPromo && <Text style={styles.oldPrice}>{oldPrice?.toFixed(2)} в‚ґ</Text>}
                </View>
            </View>
            {onAdd && (
                <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
                    <Icon name="add-circle" size={26} color={COLORS.accent} />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: { flexDirection: 'row', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.card },
    image: { width: 56, height: 56, borderRadius: RADIUS.sm },
    placeholder: { backgroundColor: COLORS.bgCardLight, justifyContent: 'center', alignItems: 'center' },
    info: { flex: 1, marginLeft: SPACING.md },
    name: { ...FONTS.medium, fontSize: 14 },
    brand: { ...FONTS.caption, marginTop: 2 },
    priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
    price: { ...FONTS.price, fontSize: 15 },
    oldPrice: { ...FONTS.priceOld },
    addBtn: { justifyContent: 'center', paddingLeft: 8 },
    promoBadge: { position: 'absolute', top: 0, left: 0, backgroundColor: COLORS.error, borderTopLeftRadius: RADIUS.md, borderBottomRightRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2, zIndex: 1 },
    promoText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});

