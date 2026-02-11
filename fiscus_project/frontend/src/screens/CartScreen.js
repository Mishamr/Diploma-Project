/**
 * @fileoverview Cart Screen.
 * 
 * Displays items added to cart with quantity controls.
 * Shows estimated total price.
 * 
 * @module screens/CartScreen
 */

import React, { useContext, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Alert,
} from 'react-native';

// Context & Theme
import { CartContext } from '../context/CartContext';
import { theme, colors, spacing, typography, getShadow } from '../theme';
import Card from '../components/Card';
import PriceTag from '../components/PriceTag';

/**
 * Cart Item Component.
 */
const CartItem = ({ item, onUpdateQuantity, onRemove }) => (
    <Card style={styles.cartItem}>
        <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.storeName}>@{item.store || 'Магазин'}</Text>
            <PriceTag amount={item.price * item.quantity} size="small" />
        </View>

        <View style={styles.controls}>
            <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => onUpdateQuantity(item.id, -1)}
            >
                <Text style={styles.btnText}>-</Text>
            </TouchableOpacity>

            <Text style={styles.quantityText}>{item.quantity}</Text>

            <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => onUpdateQuantity(item.id, 1)}
            >
                <Text style={styles.btnText}>+</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => onRemove(item.id)}
            >
                <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
        </View>
    </Card>
);

/**
 * Cart Screen Component.
 */
export default function CartScreen({ navigation }) {
    const {
        items,
        total,
        updateQuantity,
        removeFromCart,
        clearCart
    } = useContext(CartContext);

    const handleClearCart = useCallback(() => {
        Alert.alert(
            'Очистити кошик?',
            'Ви впевнені, що хочете видалити всі товари?',
            [
                { text: 'Скасувати', style: 'cancel' },
                { text: 'Видалити', style: 'destructive', onPress: clearCart },
            ]
        );
    }, [clearCart]);

    const handleCheckout = () => {
        navigation.navigate('Map', { mode: 'basket' });
    };

    if (items.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🛒</Text>
                <Text style={styles.emptyTitle}>Кошик порожній</Text>
                <Text style={styles.emptyText}>Додайте товари з каталогу,</Text>
                <Text style={styles.emptyText}>щоб знайти найкращу ціну.</Text>

                <TouchableOpacity
                    style={styles.goButton}
                    onPress={() => navigation.navigate('Home')}
                >
                    <Text style={styles.goButtonText}>До каталогу</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={items}
                renderItem={({ item }) => (
                    <CartItem
                        item={item}
                        onUpdateQuantity={updateQuantity}
                        onRemove={removeFromCart}
                    />
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <View style={styles.header}>
                        <Text style={styles.headerText}>
                            {items.length} {items.length === 1 ? 'товар' : 'товарів'}
                        </Text>
                        <TouchableOpacity onPress={handleClearCart}>
                            <Text style={styles.clearText}>Очистити</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Разом (орієнтовно):</Text>
                    <PriceTag amount={total} size="large" variant="success" />
                </View>

                <TouchableOpacity
                    style={styles.checkoutButton}
                    activeOpacity={0.8}
                    onPress={handleCheckout}
                >
                    <Text style={styles.checkoutText}>Знайти найдешевший магазин ➔</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    listContent: {
        padding: spacing.m,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.m,
        paddingHorizontal: spacing.s,
    },
    headerText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    clearText: {
        ...typography.caption,
        color: colors.danger,
        fontWeight: '600',
    },
    cartItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.m,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    storeName: {
        ...typography.small,
        color: colors.textMuted,
        marginBottom: 4,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: spacing.m,
    },
    quantityBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    btnText: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 18,
    },
    quantityText: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
        marginHorizontal: spacing.m,
        minWidth: 20,
        textAlign: 'center',
    },
    removeBtn: {
        marginLeft: spacing.m,
        padding: 4,
    },
    removeText: {
        color: colors.textMuted,
        fontSize: 16,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surface,
        padding: spacing.l,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        ...getShadow('large'),
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    totalLabel: {
        ...typography.subtitle,
        color: colors.textSecondary,
    },
    checkoutButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.m,
        borderRadius: theme.borderRadius.l,
        alignItems: 'center',
    },
    checkoutText: {
        ...typography.body,
        fontWeight: '700',
        color: colors.textInverse,
    },
    emptyContainer: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: spacing.l,
    },
    emptyTitle: {
        ...typography.title,
        color: colors.text,
        marginBottom: spacing.s,
    },
    emptyText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    goButton: {
        marginTop: spacing.xl,
        paddingVertical: spacing.m,
        paddingHorizontal: spacing.xl,
        backgroundColor: colors.surface,
        borderRadius: theme.borderRadius.l,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    goButtonText: {
        color: colors.primary,
        fontWeight: '600',
    },
});
