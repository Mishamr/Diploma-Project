import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import { useSurvivalStore } from '../stores';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function SurvivalScreen() {
    const { basket, loading, fetchSurvival } = useSurvivalStore();
    const [budget, setBudget] = useState(5000);
    const [days, setDays] = useState(7);

    useEffect(() => { fetchSurvival(budget, days); }, [budget, days]);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <LinearGradient colors={[COLORS.accent, COLORS.accentDark, '#064e3b']} style={styles.header}>
                <Icon name="shield-checkmark" size={32} color="#fff" />
                <Text style={styles.headerTitle}>Р РµР¶РёРј РІРёР¶РёРІР°РЅРЅСЏ</Text>
                <Text style={styles.headerSub}>РњС–РЅС–РјР°Р»СЊРЅРёР№ Р±СЋРґР¶РµС‚ РЅР° С‚РёР¶РґРµРЅСЊ</Text>
            </LinearGradient>

            {/* Controls */}
            <View style={styles.controls}>
                <View style={styles.controlGroup}>
                    <Text style={styles.controlLabel}>Р‘СЋРґР¶РµС‚ (в‚ґ)</Text>
                    <View style={styles.stepper}>
                        <TouchableOpacity onPress={() => setBudget(Math.max(500, budget - 500))} style={styles.stepBtn}>
                            <Icon name="remove" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        <Text style={styles.stepValue}>{budget}</Text>
                        <TouchableOpacity onPress={() => setBudget(budget + 500)} style={styles.stepBtn}>
                            <Icon name="add" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.controlGroup}>
                    <Text style={styles.controlLabel}>Р”РЅС–РІ</Text>
                    <View style={styles.stepper}>
                        <TouchableOpacity onPress={() => setDays(Math.max(1, days - 1))} style={styles.stepBtn}>
                            <Icon name="remove" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        <Text style={styles.stepValue}>{days}</Text>
                        <TouchableOpacity onPress={() => setDays(days + 1)} style={styles.stepBtn}>
                            <Icon name="add" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 40 }} />
            ) : basket ? (
                <>
                    {/* Total */}
                    <View style={styles.totalCard}>
                        <Text style={styles.totalLabel}>Р—Р°РіР°Р»СЊРЅР° РІР°СЂС‚С–СЃС‚СЊ</Text>
                        <Text style={styles.totalValue}>{basket.total_cost?.toFixed(2) || '0'} в‚ґ</Text>
                        <Text style={styles.totalSub}>Р‘СЋРґР¶РµС‚: {budget} в‚ґ / {days} РґРЅС–РІ</Text>
                    </View>

                    {/* Items */}
                    {(basket.items || []).map((item, idx) => (
                        <View key={idx} style={styles.itemCard}>
                            <View style={styles.itemIcon}>
                                <Icon name="nutrition" size={20} color={COLORS.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itemName}>{item.name || item.product_name}</Text>
                                <Text style={styles.itemChain}>{item.chain || item.store}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.itemPrice}>{item.price?.toFixed(2)} в‚ґ</Text>
                                {item.quantity && <Text style={styles.itemQty}>Г—{item.quantity}</Text>}
                            </View>
                        </View>
                    ))}

                    {/* Tips */}
                    {basket.tips && basket.tips.length > 0 && (
                        <View style={styles.tipsSection}>
                            <Text style={styles.tipsTitle}>рџ’Ў РџРѕСЂР°РґРё</Text>
                            {basket.tips.map((tip, idx) => (
                                <Text key={idx} style={styles.tipText}>вЂў {tip}</Text>
                            ))}
                        </View>
                    )}
                </>
            ) : (
                <Text style={styles.emptyText}>РќР°С‚РёСЃРЅС–С‚СЊ РґР»СЏ РіРµРЅРµСЂР°С†С–С— РєРѕС€РёРєР°</Text>
            )}
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgPrimary },
    header: { padding: SPACING.lg, alignItems: 'center' },
    headerTitle: { ...FONTS.title, color: '#fff', marginTop: SPACING.sm },
    headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
    controls: { flexDirection: 'row', paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, gap: SPACING.md },
    controlGroup: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.borderLight },
    controlLabel: { ...FONTS.caption, marginBottom: 8 },
    stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    stepBtn: { padding: 8, backgroundColor: COLORS.bgInput, borderRadius: RADIUS.sm },
    stepValue: { ...FONTS.bold, fontSize: 18, minWidth: 40, textAlign: 'center' },
    totalCard: { backgroundColor: COLORS.bgCard, margin: SPACING.lg, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
    totalLabel: { ...FONTS.caption },
    totalValue: { fontSize: 36, fontWeight: '800', color: COLORS.accent, marginVertical: 4 },
    totalSub: { ...FONTS.caption, fontSize: 12 },
    itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.borderLight },
    itemIcon: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
    itemName: { ...FONTS.medium, fontSize: 14 },
    itemChain: { ...FONTS.caption, marginTop: 2 },
    itemPrice: { ...FONTS.price, fontSize: 14 },
    itemQty: { ...FONTS.caption, fontSize: 11 },
    tipsSection: { marginHorizontal: SPACING.lg, marginTop: SPACING.md, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.borderLight },
    tipsTitle: { ...FONTS.bold, marginBottom: 8 },
    tipText: { ...FONTS.regular, color: COLORS.textSecondary, marginBottom: 4, lineHeight: 20 },
    emptyText: { ...FONTS.caption, textAlign: 'center', marginTop: 60 },
});

