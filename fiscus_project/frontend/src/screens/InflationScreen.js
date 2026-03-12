import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import { LineChart } from 'react-native-chart-kit';
import { useInflation } from '../hooks';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function InflationScreen() {
    const { data, loading } = useInflation(30);

    const chartConfig = {
        backgroundColor: COLORS.bgCard,
        backgroundGradientFrom: COLORS.bgCard,
        backgroundGradientTo: COLORS.bgSecondary,
        decimalPlaces: 1,
        color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
        labelColor: () => COLORS.textMuted,
        propsForDots: { r: '4', strokeWidth: '2', stroke: COLORS.primary },
    };

    const dailyData = data?.daily_averages || [];
    const chartLabels = dailyData.slice(-7).map(d => {
        const date = new Date(d.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    const chartValues = dailyData.slice(-7).map(d => parseFloat(d.avg_price) || 0);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <LinearGradient colors={['#3b82f6', '#1d4ed8', '#1e3a5f']} style={styles.header}>
                <Icon name="trending-up" size={32} color="#fff" />
                <Text style={styles.headerTitle}>РђРЅР°Р»С–С‚РёРєР° С†С–РЅ</Text>
                <Text style={styles.headerSub}>РўСЂРµРЅРґРё Р·Р° РѕСЃС‚Р°РЅРЅС– 30 РґРЅС–РІ</Text>
            </LinearGradient>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
            ) : (
                <>
                    {/* Chart */}
                    {chartValues.length > 0 && (
                        <View style={styles.chartCard}>
                            <Text style={styles.chartTitle}>РЎРµСЂРµРґРЅСЏ С†С–РЅР° (в‚ґ)</Text>
                            <LineChart
                                data={{ labels: chartLabels, datasets: [{ data: chartValues }] }}
                                width={width - SPACING.lg * 2 - SPACING.md * 2}
                                height={200}
                                chartConfig={chartConfig}
                                bezier
                                style={styles.chart}
                            />
                        </View>
                    )}

                    {/* By chain */}
                    {data?.by_chain && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>РџРѕ РјРµСЂРµР¶Р°С…</Text>
                            {Object.entries(data.by_chain).map(([slug, info]) => (
                                <View key={slug} style={styles.chainCard}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.chainName}>{info.name}</Text>
                                        <Text style={styles.chainCount}>{info.products_count} С‚РѕРІР°СЂС–РІ</Text>
                                    </View>
                                    <Text style={styles.chainAvg}>{info.avg_price} в‚ґ</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {!chartValues.length && !data?.by_chain && (
                        <View style={styles.emptyState}>
                            <Icon name="analytics-outline" size={48} color={COLORS.textMuted} />
                            <Text style={styles.emptyText}>РќРµРґРѕСЃС‚Р°С‚РЅСЊРѕ РґР°РЅРёС… РґР»СЏ Р°РЅР°Р»С–С‚РёРєРё</Text>
                        </View>
                    )}
                </>
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
    chartCard: { backgroundColor: COLORS.bgCard, margin: SPACING.lg, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.card },
    chartTitle: { ...FONTS.bold, marginBottom: SPACING.sm },
    chart: { borderRadius: RADIUS.md },
    section: { paddingHorizontal: SPACING.lg },
    sectionTitle: { ...FONTS.subtitle, marginBottom: SPACING.sm },
    chainCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.borderLight },
    chainName: { ...FONTS.medium, fontSize: 14 },
    chainCount: { ...FONTS.caption, marginTop: 2 },
    chainAvg: { ...FONTS.price, fontSize: 16 },
    emptyState: { alignItems: 'center', marginTop: 80 },
    emptyText: { ...FONTS.caption, marginTop: SPACING.md, fontSize: 15 },
});

