/**
 * Analytics screen — dynamic data from Purchase model.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    SafeAreaView,
    TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import GlassCard from '../components/GlassCard';
import SavingsChart from '../components/SavingsChart';
import CalendarWidget from '../components/CalendarWidget';
import apiClient from '../api/client';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import ROUTES from '../constants/routes';
import { useNavigation } from '@react-navigation/native';

export default function AnalyticsScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const data = await apiClient.get('/analytics/user/');
                setUserData(data);
                setHistory(data.history || []);
            } catch (error) {
                console.error("Analytics fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    const totalSpent = userData?.total_spent || 0;
    const totalSaved = userData?.total_saved || 0;
    const avgPerTrip = history.length > 0 ? (totalSpent / history.length).toFixed(0) : 0;
    const bestDeal = history.length > 0 ? Math.max(...history.map(h => h.saved_amount)).toFixed(0) : 0;

    const stats = [
        { icon: 'wallet-outline', label: 'Витрати', value: `${totalSpent.toLocaleString('uk-UA')} ₴`, color: COLORS.primary },
        { icon: 'cash-outline', label: 'Збережено', value: `${totalSaved.toLocaleString('uk-UA')} ₴`, color: COLORS.accent },
        { icon: 'bar-chart', label: 'За поїздку', value: `${avgPerTrip} ₴`, color: COLORS.primaryLight },
        { icon: 'sparkles', label: 'Найкраща', value: `${bestDeal} ₴`, color: COLORS.warning },
    ];

    const savingsData = history.length > 0 
        ? history.slice(0, 7).reverse().map((h) => {
            const d = new Date(h.date);
            return {
                label: `${d.getDate()}/${d.getMonth() + 1}`,
                value: h.saved_amount
            };
        }) 
        : [{ label: 'Немає', value: 0 }];

    const activeDays = history.map(h => new Date(h.date).getDate());

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bgPrimary }}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <LinearGradient
                    colors={COLORS.gradientSavings || ['#6366f1', '#8b5cf6']}
                    style={styles.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Icon name="bar-chart" size={28} color="#fff" />
                    <Text style={styles.headerTitle}>Аналітика</Text>
                    <Text style={styles.headerSub}>Ваші заощадження та тренди</Text>
                </LinearGradient>

                {/* Stats row */}
                <View style={styles.statsRow}>
                    {stats.map((s, i) => (
                        <GlassCard key={i} style={styles.statCard}>
                            <Icon name={s.icon} size={22} color={s.color} />
                            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </GlassCard>
                    ))}
                </View>

                {/* Yearly Calendar Button */}
                <TouchableOpacity 
                    style={styles.calendarLink} 
                    onPress={() => navigation.navigate(ROUTES.EXPENSE_CALENDAR)}
                >
                    <LinearGradient
                        colors={['rgba(56, 189, 248, 0.1)', 'rgba(56, 189, 248, 0.05)']}
                        style={styles.calendarLinkInner}
                    >
                        <Icon name="calendar" size={24} color={COLORS.primary} />
                        <View style={{ flex: 1, marginLeft: SPACING.md }}>
                            <Text style={styles.calendarLinkTitle}>Річний календар витрат</Text>
                            <Text style={styles.calendarLinkSub}>Перегляд історії по місяцях</Text>
                        </View>
                        <Icon name="chevron-forward" size={20} color={COLORS.primary} />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Savings chart */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📈 Заощадження</Text>
                    <SavingsChart data={savingsData} title="" />
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 32 }} />
                ) : (
                    <>
                        {/* Recent Purchases */}
                        {history.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>🛍 Попередні покупки</Text>
                                {history.map((item) => (
                                    <GlassCard key={item.id} style={styles.historyCard}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.historyChain}>{item.chain_name}</Text>
                                            <Text style={styles.historyDate}>{new Date(item.date).toLocaleDateString()}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.historyTotal}>{item.total_price.toFixed(2)} ₴</Text>
                                            <Text style={styles.historySaved}>Економія: {item.saved_amount.toFixed(2)} ₴</Text>
                                        </View>
                                    </GlassCard>
                                ))}
                            </View>
                        )}

                        {/* Last Login Info */}
                        {userData?.last_login && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>🕒 Активність</Text>
                                <GlassCard style={styles.loginCard}>
                                    <Icon name="time-outline" size={24} color={COLORS.primary} />
                                    <View style={{ marginLeft: SPACING.md }}>
                                        <Text style={styles.loginTitle}>Останній вхід</Text>
                                        <Text style={styles.loginDate}>{new Date(userData.last_login).toLocaleString()}</Text>
                                    </View>
                                </GlassCard>
                            </View>
                        )}
                    </>
                )}

                {/* Calendar */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📅 Календар покупок</Text>
                    <CalendarWidget activeDays={activeDays} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scroll: {
        backgroundColor: COLORS.bgPrimary,
        flex: 1,
    },
    content: {
        paddingBottom: 120,
        flexGrow: 1,
    },
    header: {
        padding: SPACING.lg,
        paddingTop: SPACING.xxl,
        alignItems: 'center',
        borderBottomLeftRadius: RADIUS.xl,
        borderBottomRightRadius: RADIUS.xl,
        marginBottom: SPACING.sm,
    },
    headerTitle: { ...FONTS.title, color: '#fff', marginTop: SPACING.sm },
    headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        gap: SPACING.sm,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xs,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
        marginTop: 4,
    },
    statLabel: {
        ...FONTS.caption,
        fontSize: 11,
        marginTop: 2,
        textAlign: 'center',
    },
    section: {
        paddingHorizontal: SPACING.lg,
        marginTop: SPACING.lg,
    },
    sectionTitle: {
        ...FONTS.sectionTitle,
        marginBottom: SPACING.sm,
    },
    historyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    historyChain: { ...FONTS.bold, fontSize: 15 },
    historyDate: { ...FONTS.caption, marginTop: 2 },
    historyTotal: { ...FONTS.price, fontSize: 16 },
    historySaved: { ...FONTS.caption, color: COLORS.success, marginTop: 2 },
    loginCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
    },
    loginTitle: { ...FONTS.medium, fontSize: 14 },
    loginDate: { ...FONTS.caption, marginTop: 2 },
    calendarLink: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
        borderRadius: RADIUS.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    calendarLinkInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
    },
    calendarLinkTitle: { ...FONTS.medium, fontSize: 16, color: COLORS.textPrimary },
    calendarLinkSub: { ...FONTS.caption, color: COLORS.textSecondary },
});
