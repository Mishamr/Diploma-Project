/**
 * Analytics screen – clean minimalist, NO icons, NO emoji in content.
 */

import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator,
    SafeAreaView, TouchableOpacity,
} from 'react-native';
import GlassCard from '../components/GlassCard';
import SavingsChart from '../components/SavingsChart';
import CalendarWidget from '../components/CalendarWidget';
import apiClient from '../api/client';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import ROUTES from '../constants/routes';
import { useNavigation } from '@react-navigation/native';

const DEMO_ANALYTICS = {
    total_spent: 4320.50,
    total_saved: 876.20,
    last_login: new Date(Date.now() - 3600000 * 2).toISOString(),
    history: [
        { id: 1, chain_name: 'АТБ',    date: new Date(Date.now() - 86400000 * 1).toISOString(),  total_price: 387.40, saved_amount: 74.60 },
        { id: 2, chain_name: 'Сільпо', date: new Date(Date.now() - 86400000 * 3).toISOString(),  total_price: 512.80, saved_amount: 98.20 },
        { id: 3, chain_name: 'АТБ',    date: new Date(Date.now() - 86400000 * 6).toISOString(),  total_price: 431.90, saved_amount: 88.10 },
        { id: 4, chain_name: 'Ашан',   date: new Date(Date.now() - 86400000 * 9).toISOString(),  total_price: 678.20, saved_amount: 145.30 },
        { id: 5, chain_name: 'Сільпо', date: new Date(Date.now() - 86400000 * 12).toISOString(), total_price: 295.60, saved_amount: 52.40 },
        { id: 6, chain_name: 'АТБ',    date: new Date(Date.now() - 86400000 * 15).toISOString(), total_price: 456.30, saved_amount: 89.50 },
        { id: 7, chain_name: 'Ашан',   date: new Date(Date.now() - 86400000 * 20).toISOString(), total_price: 534.10, saved_amount: 114.20 },
    ],
};

const CHAIN_COLORS = { 'АТБ': COLORS.primary, 'Сільпо': COLORS.warning, 'Ашан': COLORS.accent };

export default function AnalyticsScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [history, setHistory] = useState([]);
    const [isDemo, setIsDemo] = useState(false);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const data = await apiClient.get('/analytics/user/');
                const hist = data.history || [];
                if (hist.length > 0) {
                    setUserData(data);
                    setHistory(hist);
                    setIsDemo(false);
                } else {
                    setUserData(DEMO_ANALYTICS);
                    setHistory(DEMO_ANALYTICS.history);
                    setIsDemo(true);
                }
            } catch {
                setUserData(DEMO_ANALYTICS);
                setHistory(DEMO_ANALYTICS.history);
                setIsDemo(true);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    const totalSpent = userData?.total_spent || 0;
    const totalSaved = userData?.total_saved || 0;
    const avgPerTrip = history.length > 0 ? (totalSpent / history.length).toFixed(0) : 0;
    const bestDeal   = history.length > 0 ? Math.max(...history.map(h => h.saved_amount)).toFixed(0) : 0;
    const savingsRate = totalSpent > 0 ? ((totalSaved / (totalSpent + totalSaved)) * 100).toFixed(1) : 0;

    const stats = [
        { label: 'Витрати',    value: `${Number(totalSpent).toLocaleString('uk-UA')} ₴`, color: COLORS.primary },
        { label: 'Збережено',  value: `${Number(totalSaved).toLocaleString('uk-UA')} ₴`, color: COLORS.accent },
        { label: 'За поїздку', value: `${avgPerTrip} ₴`,                                 color: COLORS.primary },
        { label: 'Найкраща',   value: `${bestDeal} ₴`,                                   color: COLORS.warning },
    ];

    const savingsData = history.length > 0
        ? history.slice(0, 7).reverse().map(h => {
            const d = new Date(h.date);
            return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: h.saved_amount };
        })
        : [{ label: 'Немає', value: 0 }];


    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bgPrimary }}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Аналітика</Text>
                    <Text style={styles.headerSub}>Ваші заощадження та тренди</Text>
                    {isDemo && (
                        <View style={styles.demoBadge}>
                            <Text style={styles.demoText}>demo дані</Text>
                        </View>
                    )}
                </View>

                {/* Savings rate */}
                {totalSaved > 0 && (
                    <View style={styles.rateRow}>
                        <View style={styles.ratePill}>
                            <View style={styles.rateAccent} />
                            <Text style={styles.rateText}>
                                Ви економите{' '}
                                <Text style={{ color: COLORS.accent, fontWeight: '800' }}>{savingsRate}%</Text>
                                {' '}від витрат
                            </Text>
                        </View>
                    </View>
                )}

                {/* Stats row */}
                <View style={styles.statsRow}>
                    {stats.map((s, i) => (
                        <GlassCard key={i} style={styles.statCard}>
                            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </GlassCard>
                    ))}
                </View>

                {/* Calendar link */}
                <TouchableOpacity
                    style={styles.calendarLink}
                    onPress={() => navigation.navigate(ROUTES.EXPENSE_CALENDAR)}
                >
                    <View style={styles.calendarLinkInner}>
                        <View style={styles.calendarAccent} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.calendarLinkTitle}>Річний календар витрат</Text>
                            <Text style={styles.calendarLinkSub}>Перегляд історії по місяцях</Text>
                        </View>
                        <Text style={{ fontSize: 20, color: COLORS.primary }}>›</Text>
                    </View>
                </TouchableOpacity>

                {/* Savings chart */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Заощадження по днях</Text>
                    <SavingsChart data={savingsData} title="" />
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 32 }} />
                ) : (
                    <>
                        {history.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Попередні покупки</Text>
                                {history.map((item) => {
                                    const savePct = item.total_price > 0
                                        ? Math.round((item.saved_amount / (item.total_price + item.saved_amount)) * 100)
                                        : 0;
                                    return (
                                        <GlassCard key={item.id} style={styles.historyCard}>
                                            <View style={styles.historyLeft}>
                                                <View style={[styles.chainDot, { backgroundColor: CHAIN_COLORS[item.chain_name] || COLORS.primary }]} />
                                                <View>
                                                    <Text style={styles.historyChain}>{item.chain_name}</Text>
                                                    <Text style={styles.historyDate}>{new Date(item.date).toLocaleDateString('uk-UA')}</Text>
                                                </View>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={styles.historyTotal}>{item.total_price.toFixed(2)} ₴</Text>
                                                <Text style={styles.historySaved}>
                                                    -{item.saved_amount.toFixed(2)} ₴{savePct > 0 ? ` (${savePct}%)` : ''}
                                                </Text>
                                            </View>
                                        </GlassCard>
                                    );
                                })}
                            </View>
                        )}

                        {userData?.last_login && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Активність</Text>
                                <GlassCard style={styles.loginCard}>
                                    <View style={styles.loginDot} />
                                    <View>
                                        <Text style={styles.loginTitle}>Останній вхід</Text>
                                        <Text style={styles.loginDate}>{new Date(userData.last_login).toLocaleString('uk-UA')}</Text>
                                    </View>
                                </GlassCard>
                            </View>
                        )}
                    </>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Календар покупок</Text>
                    <CalendarWidget history={history} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scroll: { backgroundColor: COLORS.bgPrimary, flex: 1 },
    content: { paddingBottom: 120, flexGrow: 1 },

    header: {
        padding: SPACING.lg, paddingTop: SPACING.xl,
        alignItems: 'center',
        backgroundColor: COLORS.bgCard,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
        marginBottom: SPACING.sm,
    },
    headerTitle: { ...FONTS.title, color: COLORS.textPrimary },
    headerSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
    demoBadge: {
        marginTop: SPACING.sm,
        backgroundColor: COLORS.primarySoft,
        borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 4,
    },
    demoText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },

    rateRow: { paddingHorizontal: SPACING.lg, marginTop: SPACING.md },
    ratePill: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
        backgroundColor: 'rgba(5,150,105,0.08)',
        borderWidth: 1, borderColor: 'rgba(5,150,105,0.2)',
    },
    rateAccent: { width: 4, height: 20, borderRadius: 2, backgroundColor: COLORS.accent },
    rateText: { ...FONTS.medium, fontSize: 13, color: COLORS.textPrimary },

    statsRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, marginTop: SPACING.md, gap: SPACING.sm },
    statCard: { flex: 1, alignItems: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.xs },
    statValue: { fontSize: 14, fontWeight: '800' },
    statLabel: { ...FONTS.caption, fontSize: 10, marginTop: 4, textAlign: 'center' },

    section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
    sectionTitle: { ...FONTS.sectionTitle, marginBottom: SPACING.sm },

    historyCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
    historyLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    chainDot: { width: 10, height: 10, borderRadius: 5 },
    historyChain: { ...FONTS.bold, fontSize: 14 },
    historyDate: { ...FONTS.caption, marginTop: 2 },
    historyTotal: { ...FONTS.price, fontSize: 15 },
    historySaved: { color: COLORS.accent, fontSize: 12, fontWeight: '600', marginTop: 2 },

    loginCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    loginDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
    loginTitle: { ...FONTS.medium, fontSize: 14 },
    loginDate: { ...FONTS.caption, marginTop: 2 },

    calendarLink: {
        marginHorizontal: SPACING.lg, marginTop: SPACING.md,
        borderRadius: RADIUS.md, overflow: 'hidden',
        borderWidth: 1, borderColor: COLORS.border,
        backgroundColor: COLORS.bgCard,
    },
    calendarLinkInner: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.md },
    calendarAccent: { width: 4, height: 36, borderRadius: 2, backgroundColor: COLORS.primary },
    calendarLinkTitle: { ...FONTS.medium, fontSize: 15, color: COLORS.textPrimary },
    calendarLinkSub: { ...FONTS.caption, color: COLORS.textSecondary, marginTop: 2 },
});
