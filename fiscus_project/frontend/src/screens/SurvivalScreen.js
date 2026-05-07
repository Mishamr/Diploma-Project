import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Platform,
    Linking,
    Easing,
    Modal,
    ActivityIndicator,
    Image,
} from 'react-native';
import * as Location from 'expo-location';

import { useSurvivalStore } from '../stores';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import ROUTES from '../constants/routes';

/* ─── Skeleton shimmer ─── */
const SkeletonPulse = ({ width, height, style }) => {
    const anim = useRef(new Animated.Value(0.3)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 800, easing: Easing.ease, useNativeDriver: false }),
                Animated.timing(anim, { toValue: 0.3, duration: 800, easing: Easing.ease, useNativeDriver: false }),
            ])
        ).start();
    }, []);
    return (
        <Animated.View
            style={[
                { width, height, borderRadius: RADIUS.sm, backgroundColor: COLORS.border, opacity: anim },
                style,
            ]}
        />
    );
};

const SurvivalSkeleton = () => (
    <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg }}>
        {/* AI indicator */}
        <View style={s.aiLoadingBox}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={s.aiLoadingText}>AI генерує оптимальний список...</Text>
        </View>
        <SkeletonPulse width="100%" height={100} style={{ borderRadius: RADIUS.lg, marginBottom: SPACING.md }} />
        {[1, 2, 3, 4].map(i => (
            <SkeletonPulse
                key={i}
                width="100%"
                height={72}
                style={{ borderRadius: RADIUS.md, marginBottom: SPACING.sm }}
            />
        ))}
    </View>
);

const ProductImage = ({ uri, style }) => {
    const [error, setError] = useState(false);
    if (uri && !error) {
        return (
            <Image
                source={{ uri }}
                style={style}
                resizeMode="cover"
                onError={() => setError(true)}
            />
        );
    }
    return (
        <View style={[style, { backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' }]}>
            <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: COLORS.border }} />
        </View>
    );
};

/* ─── Substitution Modal ─── */
const SubstitutionModal = ({
    visible,
    loading,
    data,
    onClose,
    onSelect,
}) => (
    <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
    >
        <View style={s.modalOverlay}>
            <View style={s.modalContent}>
                <View style={s.modalHeader}>
                    <Text style={s.modalTitle}>Альтернативи</Text>
                    <TouchableOpacity onPress={onClose} style={s.modalClose}>
                        <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' }}>Закрити</Text>
                    </TouchableOpacity>
                </View>

                {data?.original_item && (
                    <View style={s.modalOriginal}>
                        <Text style={s.modalOriginalLabel}>Замінити:</Text>
                        <Text style={s.modalOriginalName}>{data.original_item}</Text>
                        <Text style={s.modalOriginalPrice}>{data.original_price?.toFixed(2)} ₴</Text>
                    </View>
                )}

                {loading ? (
                    <View style={s.modalLoading}>
                        <ActivityIndicator size="large" color={COLORS.accent} />
                        <Text style={s.modalLoadingText}>Шукаємо альтернативи...</Text>
                    </View>
                ) : data?.substitutions?.length > 0 ? (
                    <ScrollView style={{ maxHeight: 300 }}>
                        {data.substitutions.map((sub, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={s.subCard}
                                onPress={() => onSelect(sub)}
                                activeOpacity={0.7}
                            >
                                <View style={s.subIconDot} />
                                <View style={{ flex: 1 }}>
                                    <Text style={s.subName}>{sub.name}</Text>
                                    <Text style={s.subChain}>
                                        {sub.chain}
                                        {sub.distance_km ? ` · ${sub.distance_km} км` : ''}
                                        {sub.is_promo && ' — акція'}
                                    </Text>
                                    {sub.reason ? (
                                        <Text style={s.subReason}>{sub.reason}</Text>
                                    ) : null}
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={s.subPrice}>{sub.price?.toFixed(2)} ₴</Text>
                                    {sub.savings > 0 && (
                                        <Text style={s.subSavings}>-{sub.savings?.toFixed(2)} ₴</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                ) : (
                    <View style={s.modalLoading}>
                        <Text style={s.modalLoadingText}>Альтернатив не знайдено</Text>
                    </View>
                )}
            </View>
        </View>
    </Modal>
);

/* ─── Animated Receipt Item ─── */
const AnimatedItem = ({ children, index, delayOffset = 0 }) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(anim, {
            toValue: 1,
            duration: 600,
            delay: index * 90 + delayOffset,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.1)),
        }).start();
    }, [index, delayOffset]);

    const translateY = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [30, 0]
    });

    return (
        <Animated.View style={{ opacity: anim, transform: [{ translateY }] }}>
            {children}
        </Animated.View>
    ); 
};

/* ─── Main Screen ─── */
export default function SurvivalScreen({ navigation }) {
    const { user } = useAuth();
    const { addBulkItems } = useCart();
    const {
        basket, loading, fetchSurvival,
        substitutions, substituteLoading, substituteItemIndex,
        fetchSubstitutions, replaceItem, clearSubstitutions,
        chain, setChain
    } = useSurvivalStore();

    const [budget, setBudget] = useState(5000);
    const [days, setDays] = useState(7);
    const [mealsPerDay, setMealsPerDay] = useState(3);
    const [error, setError] = useState(null);
    const [userLat, setUserLat] = useState(null);
    const [userLon, setUserLon] = useState(null);

    const getLocation = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                setUserLat(loc.coords.latitude);
                setUserLon(loc.coords.longitude);
                return { lat: loc.coords.latitude, lon: loc.coords.longitude };
            }
        } catch (e) {
            console.warn('Geolocation error:', e);
        }
        return { lat: null, lon: null };
    }, []);

    const doFetch = useCallback(async (b, d, m) => {
        setError(null);
        try {
            const { lat, lon } = await getLocation();
            await fetchSurvival(b, d, lat, lon, m);
        } catch (e) {
            setError(e.message || 'Помилка завантаження');
        }
    }, [fetchSurvival, getLocation]);

    useEffect(() => {
        doFetch(budget, days, mealsPerDay);
    }, []);

    const handleSubstitute = (itemIndex) => {
        const item = basket?.items?.[itemIndex];
        if (!item) return;
        fetchSubstitutions(
            itemIndex,
            item.product_name || item.name,
            item.price_per_unit,
            budget,
            days,
            userLat,
            userLon,
        );
    };

    const handleSelectSubstitution = (sub) => {
        if (substituteItemIndex !== null) {
            replaceItem(substituteItemIndex, sub);
        }
    };

    const openMaps = (lat, lon, name) => {
        const url = Platform.select({
            ios: `maps:0,0?q=${name}@${lat},${lon}`,
            android: `geo:0,0?q=${lat},${lon}(${name})`,
            default: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
        });
        if (url) Linking.openURL(url).catch(() => {});
    };

    const handleAddToCart = () => {
        if (!basket?.items) return;
        const cartItems = basket.items.map(i => ({
            productId: i.product_id,
            name: i.product_name || i.name,
            price: parseFloat(i.price_per_unit || i.price || 0),
            store: i.store,
            storeId: i.store_id || i.store,
            chain: i.chain,
            quantity: i.quantity || 1,
            image: i.image_url || null,
            isPromo: i.is_promo || false,
        }));
        addBulkItems(cartItems);
        navigation.navigate(ROUTES.COMPARE_CART);
    };

    // Unique stores
    const mapStores = [];
    if (basket?.items) {
        const seen = new Set();
        basket.items.forEach(item => {
            if (item.lat && item.lon && !seen.has(item.store_id)) {
                seen.add(item.store_id);
                mapStores.push({
                    id: item.store_id,
                    name: item.store || item.chain,
                    lat: item.lat,
                    lon: item.lon,
                });
            }
        });
    }

    // Group items by category
    const groupedItems = {};
    if (basket?.items) {
        basket.items.forEach((item, idx) => {
            const cat = item.category || 'Інше';
            if (!groupedItems[cat]) groupedItems[cat] = [];
            groupedItems[cat].push({ ...item, _originalIndex: idx });
        });
    }

    return (
        <View style={s.container}>
            <ScrollView 
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={Platform.OS === 'web'}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
            >
            <View style={s.header}>
                <View style={s.headerTopRow}>
                    <View style={s.headerAccentBar} />
                    <View style={s.userStats}>
                        {user?.is_pro ? (
                            <View style={s.proBadge}>
                                <Text style={s.proText}>PRO</Text>
                            </View>
                        ) : (
                            <TouchableOpacity style={s.ticketBadge} onPress={() => navigation.navigate(ROUTES.STORE)}>
                                <Text style={s.ticketText}>Тікетів: {user?.tickets || 0}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <Text style={s.headerTitle}>Режим виживання</Text>
                <Text style={s.headerSub}>Оптимізований кошик покупок</Text>
            </View>

            {/* Controls */}
            <View style={s.controls}>
                <View style={s.controlGroup}>
                    <Text style={s.controlLabel}>Бюджет (₴)</Text>
                    <View style={s.stepper}>
                        <TouchableOpacity onPress={() => setBudget(Math.max(500, budget - 500))} style={s.stepBtn}>
                            <Text style={s.stepBtnText}>−</Text>
                        </TouchableOpacity>
                        <TextInput
                            style={s.stepInput}
                            value={String(budget)}
                            onChangeText={(text) => {
                                const val = parseInt(text.replace(/[^0-9]/g, ''), 10);
                                setBudget(isNaN(val) ? 0 : val);
                            }}
                            keyboardType="numeric"
                        />
                        <TouchableOpacity onPress={() => setBudget(budget + 500)} style={s.stepBtn}>
                            <Text style={s.stepBtnText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={s.controlGroup}>
                    <Text style={s.controlLabel}>Днів</Text>
                    <View style={s.stepper}>
                        <TouchableOpacity onPress={() => setDays(Math.max(1, days - 1))} style={s.stepBtn}>
                            <Text style={s.stepBtnText}>−</Text>
                        </TouchableOpacity>
                        <TextInput
                            style={s.stepInput}
                            value={String(days)}
                            onChangeText={(text) => {
                                const val = parseInt(text.replace(/[^0-9]/g, ''), 10);
                                setDays(isNaN(val) ? 0 : val);
                            }}
                            keyboardType="numeric"
                        />
                        <TouchableOpacity onPress={() => setDays(days + 1)} style={s.stepBtn}>
                            <Text style={s.stepBtnText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={s.controlGroup}>
                    <Text style={s.controlLabel}>Прийоми їжі/день</Text>
                    <View style={s.stepper}>
                        <TouchableOpacity onPress={() => setMealsPerDay(Math.max(1, mealsPerDay - 1))} style={s.stepBtn}>
                            <Text style={s.stepBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={s.stepValue}>{mealsPerDay}</Text>
                        <TouchableOpacity onPress={() => setMealsPerDay(Math.min(6, mealsPerDay + 1))} style={s.stepBtn}>
                            <Text style={s.stepBtnText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Chain Selection */}
            <View style={s.chainSelector}>
                <Text style={s.controlLabel}>Мережа магазинів</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chainChips}>
                    <TouchableOpacity 
                        style={[s.chainChip, !chain && s.chainChipActive]} 
                        onPress={() => setChain(null)}
                    >
                        <Text style={[s.chainChipText, !chain && s.chainChipTextActive]}>Всі</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[s.chainChip, chain === 'atb' && s.chainChipActive]} 
                        onPress={() => setChain('atb')}
                    >
                        <Text style={[s.chainChipText, chain === 'atb' && s.chainChipTextActive]}>АТБ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[s.chainChip, chain === 'silpo' && s.chainChipActive]} 
                        onPress={() => setChain('silpo')}
                    >
                        <Text style={[s.chainChipText, chain === 'silpo' && s.chainChipTextActive]}>Сільпо</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[s.chainChip, chain === 'auchan' && s.chainChipActive]} 
                        onPress={() => setChain('auchan')}
                    >
                        <Text style={[s.chainChipText, chain === 'auchan' && s.chainChipTextActive]}>Ашан</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Generate button */}
            <TouchableOpacity
                style={s.generateBtn}
                onPress={() => doFetch(budget, days, mealsPerDay)}
                activeOpacity={0.8}
            >
                <Text style={s.generateText}>Сформувати кошик</Text>
            </TouchableOpacity>

            {/* Content */}
            {loading ? (
                <SurvivalSkeleton />
            ) : error === 'Недостатньо тікетів' ? (
                <View style={s.errorContainer}>
                    <Text style={[s.errorText, { color: COLORS.textPrimary, ...FONTS.title, marginTop: 16 }]}>Закінчилися тікети</Text>
                    <Text style={[s.errorText, { color: COLORS.textSecondary }]}>Для формування кошика потрібен 1 тікет.</Text>
                    
                    <TouchableOpacity style={[s.retryBtn, { backgroundColor: COLORS.surface, marginTop: 12, width: '100%' }]} onPress={() => navigation.navigate(ROUTES.STORE)}>
                        <Text style={[s.retryText, { color: COLORS.primary }]}>Магазин тікетів / PRO</Text>
                    </TouchableOpacity>
                </View>
            ) : error ? (
                <View style={s.errorContainer}>
                    <Text style={s.errorText}>{error}</Text>
                    <TouchableOpacity style={s.retryBtn} onPress={() => doFetch(budget, days, mealsPerDay)}>
                        <Text style={s.retryText}>Спробувати знову</Text>
                    </TouchableOpacity>
                </View>
            ) : basket ? (
                <>
                    {/* Status badge */}
                    {basket.ai_generated && (
                        <View style={s.aiBadge}>
                            <Text style={s.aiBadgeText}>Список сформовано</Text>
                        </View>
                    )}

                    {/* Total (Receipt) */}
                    <AnimatedItem index={0}>
                        <View style={s.receiptCard}>
                            <Text style={s.receiptTitle}>КОШИК ПОКУПОК</Text>
                            <View style={s.dashedLine} />
                            <Text style={s.totalLabel}>Разом до сплати:</Text>
                            <Text style={s.totalValue}>{basket.total_cost?.toFixed(2) || '0'} ₴</Text>
                            <Text style={s.totalSub}>Бюджет: {budget} ₴ / {days} днів</Text>
                            {basket.daily_cost > 0 && (
                                <Text style={s.dailyCost}>≈ {basket.daily_cost.toFixed(2)} ₴ на день</Text>
                            )}
                            <View style={s.dashedLine} />
                            <Text style={s.receiptFooter}>Згенеровано штучним інтелектом</Text>
                        </View>
                    </AnimatedItem>

                    {/* Items grouped by category */}
                    {(() => {
                        let globalIndex = 1;
                        return Object.entries(groupedItems).map(([category, items]) => (
                            <View key={category} style={s.categorySection}>
                                <AnimatedItem index={globalIndex++}>
                                    <View style={s.categoryHeader}>
                                        <Text style={s.categoryTitle}>{category}</Text>
                                        <View style={s.categoryLine} />
                                    </View>
                                </AnimatedItem>
                                {items.map((item, idx) => (
                                    <AnimatedItem key={idx} index={globalIndex++}>
                                        <View style={s.itemCard}>
                                    <TouchableOpacity
                                        style={s.itemMain}
                                        activeOpacity={item.lat && item.lon ? 0.7 : 1}
                                        onPress={() =>
                                            item.lat && item.lon &&
                                            openMaps(item.lat, item.lon, item.store || item.chain)
                                        }
                                    >
                                        <View style={s.itemIconWrap}>
                                            <ProductImage uri={item.image_url} style={s.itemImage} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.itemName}>{item.name || item.product_name}</Text>
                                            <Text style={s.itemChain}>
                                                {item.chain || item.store}
                                                {item.distance_km ? ` • ${item.distance_km} км` : ''}
                                                {item.is_promo && ' Акція'}
                                            </Text>
                                            {item.ai_reason ? (
                                                <Text style={s.itemReason}>{item.ai_reason}</Text>
                                            ) : null}
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={s.itemPrice}>{item.price_per_unit?.toFixed(2)} ₴</Text>
                                            {item.quantity && <Text style={s.itemQty}>×{item.quantity}</Text>}
                                        </View>
                                    </TouchableOpacity>
                                    {/* Substitute button */}
                                    <TouchableOpacity
                                        style={s.swapBtn}
                                        onPress={() => handleSubstitute(item._originalIndex)}
                                    >
                                        <Text style={s.swapText}>Знайти заміну</Text>
                                    </TouchableOpacity>
                                        </View>
                                    </AnimatedItem>
                                ))}
                            </View>
                        ));
                    })()}

                    {/* Store links */}
                    {mapStores.length > 0 && (
                        <View style={s.storesSection}>
                            <Text style={s.storesSectionTitle}>Магазини</Text>
                            {mapStores.map(store => (
                                <TouchableOpacity
                                    key={store.id}
                                    style={s.storeLink}
                                    onPress={() => openMaps(store.lat, store.lon, store.name)}
                                >
                                    <View style={s.storeDot} />
                                    <Text style={s.storeLinkText}>{store.name}</Text>
                                    <Text style={{ fontSize: 12, color: COLORS.textMuted }}>›</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Tips */}
                    {basket.tips && basket.tips.length > 0 && (
                        <View style={s.tipsSection}>
                            <Text style={s.tipsTitle}>Аналіз кошика</Text>
                            {basket.tips.map((tip, idx) => (
                                <Text key={idx} style={s.tipText}>{tip}</Text>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity 
                        style={[s.generateBtn, s.generateBtnSecondary, { marginBottom: SPACING.md }]} 
                        onPress={handleAddToCart}
                        activeOpacity={0.8}
                    >
                        <Text style={s.generateText}>Додати всі товари до кошика</Text>
                    </TouchableOpacity>

                    {/* AI Disclaimer */}
                    <View style={s.disclaimerSection}>
                        <Text style={s.disclaimerText}>
                            Цей список складено за допомогою штучного інтелекту та має рекомендаційний характер. 
                            AI не є професійним дієтологом — за потреби проконсультуйтеся з фахівцем. 
                            Відповідальність за вибір продуктів та їх кількість несе користувач.
                        </Text>
                    </View>
                </>
            ) : (
                <View style={s.emptyContainer}>
                    <Text style={s.emptyText}>Встановіть бюджет та кількість днів, після чого натисніть «Сформувати кошик»</Text>
                </View>
            )}
            <View style={{ height: 40 }} />

            {/* Substitution Modal */}
            <SubstitutionModal
                visible={substituteItemIndex !== null}
                loading={substituteLoading}
                data={substitutions}
                onClose={clearSubstitutions}
                onSelect={handleSelectSubstitution}
            />
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container: Platform.OS === 'web' ? { height: '100vh', backgroundColor: COLORS.bgPrimary, overflow: 'hidden' } : { flex: 1, backgroundColor: COLORS.bgPrimary },
    header: { padding: SPACING.lg, alignItems: 'center', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: SPACING.sm },
    headerAccentBar: { width: 32, height: 4, borderRadius: 2, backgroundColor: COLORS.primary },
    userStats: { flexDirection: 'row', alignItems: 'center' },
    ticketBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgSecondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
    ticketText: { ...FONTS.bold, color: COLORS.textPrimary, fontSize: 14 },
    proBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full },
    proText: { ...FONTS.bold, color: '#fff', fontSize: 12 },
    headerTitle: { ...FONTS.title, color: COLORS.textPrimary, marginTop: SPACING.xs },
    headerSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
    controls: { flexDirection: 'row', paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, gap: SPACING.md },
    controlGroup: { flex: 1, backgroundColor: COLORS.white, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
    controlLabel: { ...FONTS.caption, marginBottom: 8 },
    
    chainSelector: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
    chainChips: { flexDirection: 'row', gap: SPACING.sm },
    chainChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
    chainChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chainChipText: { ...FONTS.medium, color: COLORS.textSecondary },
    chainChipTextActive: { color: '#fff', fontWeight: 'bold' },

    stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md },
    stepBtn: { padding: 8, backgroundColor: COLORS.bgSecondary, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, minWidth: 34, alignItems: 'center' },
    stepBtnText: { fontSize: 18, color: COLORS.primary, fontWeight: '700', lineHeight: 22 },
    stepValue: { ...FONTS.bold, fontSize: 18, minWidth: 40, textAlign: 'center' },
    stepInput: { ...FONTS.bold, fontSize: 18, minWidth: 50, textAlign: 'center', color: COLORS.textPrimary, padding: 0, height: 36 },

    generateBtn: { marginHorizontal: SPACING.lg, marginTop: SPACING.md, borderRadius: RADIUS.full, backgroundColor: COLORS.primary, paddingVertical: SPACING.md, alignItems: 'center', justifyContent: 'center' },
    generateBtnSecondary: { backgroundColor: COLORS.surface },
    generateText: { ...FONTS.bold, color: '#fff', fontSize: 16 },

    disclaimerSection: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.xl,
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    disclaimerText: {
        ...FONTS.regular,
        fontSize: 11,
        color: COLORS.textMuted,
        lineHeight: 16,
        textAlign: 'center',
    },

    aiBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.md, paddingVertical: 6 },
    aiBadgeText: { ...FONTS.caption, color: COLORS.accent, fontSize: 12 },

    aiLoadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginBottom: SPACING.md, paddingVertical: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
    aiLoadingText: { ...FONTS.medium, color: COLORS.accent, fontSize: 14 },

    receiptCard: { 
        backgroundColor: '#Fdfcf7', 
        margin: SPACING.lg, 
        marginTop: SPACING.md,
        borderRadius: 4, 
        padding: SPACING.lg, 
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: '#e2dbcc', 
        ...SHADOWS.card 
    },
    receiptTitle: { ...FONTS.bold, fontSize: 13, color: '#444', letterSpacing: 1.5, marginBottom: 4 },
    dashedLine: { width: '100%', height: 1, borderWidth: 1, borderStyle: 'dashed', borderColor: '#ccc', marginVertical: SPACING.md },
    totalLabel: { ...FONTS.medium, color: '#333', fontSize: 15 },
    totalValue: { fontSize: 40, fontWeight: '900', color: '#111', marginVertical: 4, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    totalSub: { ...FONTS.caption, fontSize: 13, color: '#666' },
    dailyCost: { ...FONTS.bold, fontSize: 13, color: '#444', marginTop: 4 },
    receiptFooter: { ...FONTS.caption, fontSize: 11, color: '#888', fontStyle: 'italic' },

    categorySection: { marginTop: SPACING.sm, paddingHorizontal: SPACING.lg },
    categoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs },
    categoryTitle: { ...FONTS.bold, fontSize: 15, color: COLORS.textSecondary },
    categoryLine: { flex: 1, height: 1, backgroundColor: COLORS.borderLight, marginLeft: SPACING.sm },

    itemCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
    itemMain: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
    itemIconWrap: { width: 44, height: 44, borderRadius: RADIUS.sm, backgroundColor: COLORS.surface, overflow: 'hidden', marginRight: SPACING.md },
    itemImage: { width: '100%', height: '100%' },
    itemName: { ...FONTS.medium, fontSize: 14 },
    itemChain: { ...FONTS.caption, marginTop: 2 },
    itemReason: { ...FONTS.caption, color: COLORS.accent, marginTop: 3, fontSize: 11 },
    itemPrice: { ...FONTS.price, fontSize: 14 },
    itemQty: { ...FONTS.caption, fontSize: 11 },

    swapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bgSecondary },
    swapText: { ...FONTS.caption, color: COLORS.primary, fontWeight: '600', fontSize: 12 },

    tipsSection: { marginHorizontal: SPACING.lg, marginTop: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
    tipsTitle: { ...FONTS.bold, marginBottom: 8 },
    tipText: { ...FONTS.regular, color: COLORS.textSecondary, marginBottom: 4, lineHeight: 20 },

    storesSection: { marginHorizontal: SPACING.lg, marginTop: SPACING.md },
    storesSectionTitle: { ...FONTS.bold, marginBottom: SPACING.sm },
    storeLink: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.xs },
    storeLinkText: { ...FONTS.medium, color: COLORS.primary, flex: 1 },
    storeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },

    errorContainer: { alignItems: 'center', padding: SPACING.xxl },
    errorText: { ...FONTS.regular, color: COLORS.error, marginTop: SPACING.md, textAlign: 'center' },
    retryBtn: { marginTop: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.full },
    retryText: { ...FONTS.medium, color: COLORS.primary },

    emptyContainer: { alignItems: 'center', padding: SPACING.xxl },
    emptyText: { ...FONTS.caption, textAlign: 'center', marginTop: SPACING.md, fontSize: 14 },

    /* Modal */
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, maxHeight: '70%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
    modalTitle: { ...FONTS.title, fontSize: 20 },
    modalClose: { padding: 4 },
    modalOriginal: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.bgSecondary, borderRadius: RADIUS.md, marginBottom: SPACING.md },
    modalOriginalLabel: { ...FONTS.caption },
    modalOriginalName: { ...FONTS.medium, flex: 1 },
    modalOriginalPrice: { ...FONTS.price, fontSize: 14 },
    modalLoading: { alignItems: 'center', padding: SPACING.xxl, gap: SPACING.md },
    modalLoadingText: { ...FONTS.caption, color: COLORS.textMuted, fontSize: 13 },

    subCard: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
    subIconDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginRight: SPACING.md },
    subName: { ...FONTS.medium, fontSize: 14 },
    subChain: { ...FONTS.caption, marginTop: 2 },
    subReason: { ...FONTS.caption, color: COLORS.accent, marginTop: 3, fontSize: 11 },
    subPrice: { ...FONTS.price, fontSize: 14 },
    subSavings: { ...FONTS.caption, color: COLORS.accent, fontWeight: '700', fontSize: 12 },
});
