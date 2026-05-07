/**
 * FavoritesScreen — список улюблених продуктів.
 */

import React from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Image,
} from 'react-native';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import Icon from '../components/Icon';
import GlassCard from '../components/GlassCard';

function FavoriteItem({ item, onRemove, onAddToCart, onPin }) {
    const price = item.latest_price || item.price || 0;
    const [imgErr, setImgErr] = React.useState(false);

    return (
        <GlassCard style={styles.card}>
            {/* Image */}
            <View style={styles.imgWrap}>
                {item.image_url && !imgErr ? (
                    <Image
                        source={{ uri: item.image_url }}
                        style={styles.img}
                        resizeMode="cover"
                        onError={() => setImgErr(true)}
                    />
                ) : (
                    <Icon name="cube-outline" size={28} color={COLORS.textMuted} />
                )}
            </View>

            {/* Info */}
            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                {item.brand && <Text style={styles.brand}>{item.brand}</Text>}
                <Text style={styles.price}>{price.toFixed(2)} ₴</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
                {/* Pin — додати до списку покупок */}
                <TouchableOpacity
                    style={styles.pinBtn}
                    onPress={() => onPin && onPin(item)}
                    activeOpacity={0.75}
                    accessibilityLabel="Додати до списку покупок"
                >
                    <Icon name="pin-outline" size={17} color="#6366f1" />
                </TouchableOpacity>

                {/* Heart — вже в улюблених (заповнений) */}
                <TouchableOpacity
                    style={styles.heartBtn}
                    onPress={() => onRemove(item)}
                    activeOpacity={0.75}
                    accessibilityLabel="Прибрати з улюблених"
                >
                    <Icon name="heart" size={17} color="#ef4444" />
                </TouchableOpacity>

            </View>
        </GlassCard>
    );
}

export default function FavoritesScreen() {
    const { favorites, removeFavorite } = useFavorites();
    const { addItem } = useCart();

    const handleAddToCart = (product) => {
        addItem({
            productId: product.id || product.productId,
            name: product.name,
            price: product.latest_price || product.price || 0,
            image_url: product.image_url,
            category_slug: product.category_slug,
            categorySlug: product.category_slug,
            category_name: product.category_name,
        });
    };

    const handlePin = (product) => {
        addItem({
            productId: product.id || product.productId,
            name: product.name,
            price: product.latest_price || product.price || 0,
            image_url: product.image_url,
            category_slug: product.category_slug,
            categorySlug: product.category_slug,
            category_name: product.category_name,
        });
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={favorites}
                keyExtractor={(item) => String(item.id || item.productId)}
                renderItem={({ item }) => (
                    <FavoriteItem
                        item={item}
                        onRemove={(p) => removeFavorite(p.id || p.productId)}
                        onAddToCart={handleAddToCart}
                        onPin={handlePin}
                    />
                )}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Icon name="heart-outline" size={56} color={COLORS.textMuted} />
                        <Text style={styles.emptyTitle}>Немає улюблених</Text>
                        <Text style={styles.emptySub}>
                            Натисніть ❤ на будь-якому продукті, щоб зберегти
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgPrimary },
    list: { padding: SPACING.lg, paddingBottom: 32 },

    card: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        paddingVertical: SPACING.sm,
    },
    imgWrap: {
        width: 52,
        height: 52,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.bgSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    img: { width: 52, height: 52 },
    info: { flex: 1, marginLeft: SPACING.md },
    name: { ...FONTS.medium, fontSize: 13 },
    brand: { ...FONTS.caption, marginTop: 2 },
    price: { ...FONTS.price, fontSize: 15, marginTop: 4 },

    actions: { flexDirection: 'row', gap: SPACING.xs, marginLeft: SPACING.sm },

    pinBtn: {
        width: 34,
        height: 34,
        borderRadius: RADIUS.sm,
        backgroundColor: 'rgba(99,102,241,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(99,102,241,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heartBtn: {
        width: 34,
        height: 34,
        borderRadius: RADIUS.sm,
        backgroundColor: 'rgba(239,68,68,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtn: {
        width: 34,
        height: 34,
        borderRadius: RADIUS.sm,
        backgroundColor: 'rgba(148,163,184,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    empty: { alignItems: 'center', marginTop: 80 },
    emptyTitle: { ...FONTS.subtitle, marginTop: SPACING.md },
    emptySub: { ...FONTS.caption, textAlign: 'center', marginTop: SPACING.xs, paddingHorizontal: SPACING.xl },
});
