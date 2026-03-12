/**
 * Analytics screen — savings tracker, graphs, calendar.
 */

import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import { useInflation } from '../hooks';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import SavingsChart from '../components/SavingsChart';
import CalendarWidget from '../components/CalendarWidget';

export default function AnalyticsScreen() {
    const { data, loading } = useInflation(30);

    const savingsData = [
        { label: '01/02', value: 45 },
        { label: '05/02', value: 120 },
        { label: '10/02', value: 85 },
        { label: '15/02', value: 200 },
        { label: '18/02', value: 150 },
        { label: '22/02', value: 310 },
        { label: '26/02', value: 280 },
    ];

    const totalSaved = 1190;
    const avgPerTrip = 170;
    const bestDeal = 310;
    const activeDays = [1, 5, 10, 15, 18, 22, 26];

    const stats = [
        { icon: 'cash-outline', label: 'Збережено', value: `${totalSaved} ₴`, color: COLORS.accent },
        { icon: 'bar-chart', label: 'За поїздку', value: `${avgPerTrip} ₴`, color: COLORS.primaryLight },
        { icon: 'sparkles', label: 'Найкраща', value: `${bestDeal} ₴`, color: COLORS.warning },
    ];

    const dailyData = data?.daily_averages || [];
    const priceChartData = dailyData.slice(-14).map(d => ({
        label: `${new Date(d.date).getDate()}/${new Date(d.date).getMonth() + 1}`,
        value: parseFloat(d.avg_price) || 0,
    }));

    return (
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

            {/* Savings chart */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📈 Заощадження</Text>
                <SavingsChart data={savingsData} title="" />
            </View>

            {/* Price trends */}
            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 32 }} />
            ) : priceChartData.length > 0 ? (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💰 Середня ціна (₴)</Text>
                    <SavingsChart data={priceChartData} title="" />
                </View>
            ) : null}

            {/* By chain */}
            {data?.by_chain && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🏪 По мережах</Text>
                    {Object.entries(data.by_chain).map(([slug, info]) => (
                        <GlassCard key={slug} style={styles.chainCard}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.chainName}>{info.name}</Text>
                                <Text style={styles.chainCount}>{info.products_count} товарів</Text>
                            </View>
                            <Text style={styles.chainAvg}>{info.avg_price} ₴</Text>
                        </GlassCard>
                    ))}
                </View>
            )}

            {/* Calendar */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📅 Календар покупок</Text>
                <CalendarWidget activeDays={activeDays} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    // flex: 1 on ScrollView itself breaks web scroll — use minHeight instead
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
    chainCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    chainName: { ...FONTS.medium, fontSize: 14 },
    chainCount: { ...FONTS.caption, marginTop: 2 },
    chainAvg: { ...FONTS.price, fontSize: 16 },
});
