import React from 'react';
import { Modal, View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Platform } from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { getChainColor } from '../constants/stores';

export default function ProductDetailModal({ visible, product, onClose, onAdd, isFavorite, onToggleFavorite }) {
    if (!product) return null;

    const fav = isFavorite;
    const accentColor = getChainColor(product.chain_slug) || COLORS.primary;

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Icon name="close-circle" size={28} color={COLORS.textMuted} />
                    </TouchableOpacity>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        <View style={styles.imageContainer}>
                            {product.image_url ? (
                                <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="contain" />
                            ) : (
                                <View style={[styles.image, styles.placeholder]}>
                                    <Icon name="cube-outline" size={64} color={COLORS.textMuted} />
                                </View>
                            )}
                            {product.is_promo && (
                                <View style={styles.promoBadge}>
                                    <Text style={styles.promoText}>АКЦІЯ</Text>
                                </View>
                            )}
                            <TouchableOpacity style={styles.favBtn} onPress={onToggleFavorite}>
                                <Icon name={fav ? 'heart' : 'heart-outline'} size={28} color={fav ? COLORS.error : COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.detailsContainer}>
                            <Text style={styles.name}>{product.name}</Text>
                            
                            <View style={styles.metaRow}>
                                {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
                                {product.brand && product.weight && <Text style={styles.metaDot}>•</Text>}
                                {product.weight && <Text style={styles.weight}>{product.weight}</Text>}
                            </View>

                            {product.category_name && (
                                <View style={styles.categoryBadge}>
                                    <Text style={styles.categoryText}>{product.category_name}</Text>
                                </View>
                            )}

                            <View style={styles.priceSection}>
                                <Text style={styles.priceLabel}>Поточна ціна ({product.chain_name || 'в магазині'}):</Text>
                                <View style={styles.priceRow}>
                                    <Text style={[styles.price, { color: accentColor }]}>
                                        {Number(product.latest_price || product.price).toFixed(2)} ₴
                                    </Text>
                                    {(product.latest_old_price || product.old_price) > (product.latest_price || product.price) && (
                                        <Text style={styles.oldPrice}>
                                            {Number(product.latest_old_price || product.old_price).toFixed(2)} ₴
                                        </Text>
                                    )}
                                </View>
                            </View>

                            <View style={styles.descriptionSection}>
                                <Text style={styles.descriptionTitle}>Про товар</Text>
                                <Text style={styles.descriptionText}>
                                    {product.description || 'Опис товару наразі відсутній. Ми працюємо над тим, щоб додати більше інформації про цей продукт.'}
                                </Text>
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={[styles.addBtn, { backgroundColor: accentColor }]} onPress={onAdd}>
                            <Icon name="cart" size={20} color="#fff" />
                            <Text style={styles.addBtnText}>Додати в кошик</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.bgPrimary,
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        height: '80%',
        paddingBottom: Platform.OS === 'ios' ? 34 : 0,
        ...SHADOWS.card,
    },
    closeBtn: {
        position: 'absolute',
        top: SPACING.md,
        right: SPACING.md,
        zIndex: 10,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 20,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    imageContainer: {
        width: '100%',
        height: 250,
        backgroundColor: COLORS.bgCard,
        justifyContent: 'center',
        alignItems: 'center',
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
    },
    image: {
        width: '80%',
        height: '80%',
    },
    placeholder: {
        backgroundColor: COLORS.bgCardLight,
        borderRadius: RADIUS.lg,
    },
    promoBadge: {
        position: 'absolute',
        top: SPACING.lg,
        left: SPACING.lg,
        backgroundColor: COLORS.error,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    promoText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800',
    },
    favBtn: {
        position: 'absolute',
        bottom: -20,
        right: SPACING.lg,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.card,
    },
    detailsContainer: {
        padding: SPACING.lg,
    },
    name: {
        ...FONTS.title,
        fontSize: 22,
        marginBottom: SPACING.xs,
        paddingRight: 40, // Space for fav button
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    brand: {
        ...FONTS.medium,
        color: COLORS.primary,
        fontSize: 14,
    },
    metaDot: {
        color: COLORS.textMuted,
        marginHorizontal: SPACING.xs,
    },
    weight: {
        ...FONTS.regular,
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.glassLight,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    categoryText: {
        ...FONTS.medium,
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    priceSection: {
        backgroundColor: COLORS.bgCard,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    priceLabel: {
        ...FONTS.caption,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    price: {
        ...FONTS.price,
        fontSize: 28,
    },
    oldPrice: {
        ...FONTS.priceOld,
        fontSize: 16,
    },
    descriptionSection: {
        marginTop: SPACING.sm,
    },
    descriptionTitle: {
        ...FONTS.bold,
        fontSize: 16,
        marginBottom: SPACING.sm,
        color: COLORS.textPrimary,
    },
    descriptionText: {
        ...FONTS.regular,
        color: COLORS.textSecondary,
        lineHeight: 22,
        fontSize: 14,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.bgCard,
        padding: SPACING.md,
        paddingBottom: Platform.OS === 'ios' ? SPACING.xl : SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.full,
        width: '100%',
        ...SHADOWS.button,
        gap: SPACING.sm,
    },
    addBtnText: {
        color: '#fff',
        ...FONTS.bold,
        fontSize: 16,
    },
});
