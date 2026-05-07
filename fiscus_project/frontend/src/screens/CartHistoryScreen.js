/**
 * CartHistoryScreen — перегляд і відновлення збережених кошиків.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    Image,
} from 'react-native';
import { useCart } from '../context/CartContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import Icon from '../components/Icon';
import GlassCard from '../components/GlassCard';

function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString('uk-UA', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function HistoryCard({ snapshot, onRestore, onDelete, onExpand, isExpanded }) {
    return (
        <GlassCard style={styles.histCard}>
            {/* Header row */}
            <TouchableOpacity style={styles.histHeader} onPress={onExpand} activeOpacity={0.8}>
                <View style={styles.histHeaderLeft}>
                    <View style={styles.histIconWrap}>
                        <Icon name="cart-outline" size={20} color={COLORS.primary} />
                    </View>
                    <View>
                        <Text style={styles.histDate}>{formatDate(snapshot.savedAt)}</Text>
                        <Text style={styles.histMeta}>
                            {snapshot.totalItems} товарів · {snapshot.totalPrice.toFixed(2)} ₴
                        </Text>
                    </View>
                </View>
                <Icon
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={COLORS.textMuted}
                />
            </TouchableOpacity>

            {/* Expanded item list */}
            {isExpanded && (
                <View style={styles.histItems}>
                    {snapshot.items.map((item, idx) => (
                        <View key={idx} style={styles.histItem}>
                            <View style={styles.histItemImg}>
                                {item.image_url ? (
                                    <Image
                                        source={{ uri: item.image_url }}
                                        style={{ width: 32, height: 32, borderRadius: 6 }}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Icon name="cube-outline" size={18} color={COLORS.textMuted} />
                                )}
                            </View>
                            <Text style={styles.histItemName} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.histItemQty}>×{item.quantity}</Text>
                            <Text style={styles.histItemPrice}>
                                {((item.price || 0) * item.quantity).toFixed(2)} ₴
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Actions */}
            <View style={styles.histActions}>
                <TouchableOpacity style={styles.restoreBtn} onPress={onRestore} activeOpacity={0.85}>
                    <Icon name="refresh" size={16} color="#fff" />
                    <Text style={styles.restoreBtnText}>Відновити</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.8}>
                    <Icon name="trash-outline" size={16} color={COLORS.error} />
                </TouchableOpacity>
            </View>
        </GlassCard>
    );
}

export default function CartHistoryScreen({ navigation }) {
    const { cartHistory, restoreCart, deleteHistoryItem } = useCart();
    const [expandedId, setExpandedId] = useState(null);

    const handleRestore = (snapshot) => {
        Alert.alert(
            'Відновити кошик?',
            `Поточний кошик буде замінено на кошик від ${formatDate(snapshot.savedAt)} (${snapshot.totalItems} товарів).`,
            [
                { text: 'Скасувати', style: 'cancel' },
                {
                    text: 'Відновити',
                    onPress: () => {
                        restoreCart(snapshot.items);
                        navigation?.goBack();
                    },
                },
            ]
        );
    };

    const handleDelete = (historyId) => {
        Alert.alert('Видалити з історії?', 'Цю дію не можна скасувати.', [
            { text: 'Скасувати', style: 'cancel' },
            { text: 'Видалити', style: 'destructive', onPress: () => deleteHistoryItem(historyId) },
        ]);
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={cartHistory}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <HistoryCard
                        snapshot={item}
                        isExpanded={expandedId === item.id}
                        onExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        onRestore={() => handleRestore(item)}
                        onDelete={() => handleDelete(item.id)}
                    />
                )}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Icon name="time-outline" size={56} color={COLORS.textMuted} />
                        <Text style={styles.emptyTitle}>Немає збережених кошиків</Text>
                        <Text style={styles.emptySub}>
                            Натисніть «Зберегти кошик» у вашому кошику, щоб зберегти поточний список
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

    histCard: { marginBottom: SPACING.sm, paddingVertical: SPACING.sm },

    histHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
    },
    histHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    histIconWrap: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.sm,
        backgroundColor: 'rgba(139,92,246,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(139,92,246,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    histDate: { ...FONTS.bold, fontSize: 14 },
    histMeta: { ...FONTS.caption, marginTop: 2, fontSize: 12 },

    histItems: {
        marginTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.border || '#eee',
        paddingTop: SPACING.sm,
        paddingHorizontal: SPACING.sm,
        gap: SPACING.xs,
    },
    histItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: 4,
    },
    histItemImg: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: COLORS.bgSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    histItemName: { ...FONTS.medium, fontSize: 13, flex: 1 },
    histItemQty: { ...FONTS.caption, fontSize: 12, color: COLORS.textMuted, minWidth: 24 },
    histItemPrice: { ...FONTS.price, fontSize: 13, minWidth: 60, textAlign: 'right' },

    histActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginTop: SPACING.sm,
        paddingHorizontal: SPACING.sm,
    },
    restoreBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.sm,
    },
    restoreBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    deleteBtn: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.md,
        backgroundColor: 'rgba(220,38,38,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(220,38,38,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: SPACING.xl },
    emptyTitle: { ...FONTS.subtitle, marginTop: SPACING.md },
    emptySub: { ...FONTS.caption, textAlign: 'center', marginTop: SPACING.xs },
});
