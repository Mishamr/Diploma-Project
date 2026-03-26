import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import apiClient from '../api/client';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const MONTHS = [
    'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
    'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
];

export default function ExpenseCalendarScreen() {
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());
    const [calendarData, setCalendarData] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(null);

    useEffect(() => {
        fetchCalendar();
    }, []);

    const fetchCalendar = async () => {
        try {
            setLoading(true);
            const data = await apiClient.get('/analytics/calendar/');
            setCalendarData(data);
        } catch (e) {
            console.error("Fetch calendar error:", e);
        } finally {
            setLoading(false);
        }
    };

    const getMonthStats = (mIdx) => {
        return calendarData.find(d => d.year === year && d.month === mIdx + 1);
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Year Selector */}
            <View style={styles.yearSelector}>
                <TouchableOpacity onPress={() => setYear(year - 1)}>
                    <Icon name="chevron-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.yearText}>{year}</Text>
                <TouchableOpacity onPress={() => setYear(year + 1)}>
                    <Icon name="chevron-forward" size={24} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.grid}>
                    {MONTHS.map((name, idx) => {
                        const stats = getMonthStats(idx);
                        return (
                            <TouchableOpacity 
                                key={idx} 
                                style={[styles.monthCard, stats && styles.monthCardActive]}
                                onPress={() => stats && setSelectedMonth(stats.month === selectedMonth?.month ? null : stats)}
                            >
                                <Text style={styles.monthName}>{name}</Text>
                                {stats ? (
                                    <>
                                        <Text style={styles.monthTotal}>{stats.total_spent.toFixed(0)} ₴</Text>
                                        <View style={styles.savingsBadge}>
                                            <Text style={styles.savingsText}>-{stats.total_saved.toFixed(0)} ₴</Text>
                                        </View>
                                    </>
                                ) : (
                                    <Text style={styles.noData}>Немає даних</Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {selectedMonth && (
                    <LinearGradient
                        colors={[COLORS.bgCard, COLORS.bgPrimary]}
                        style={styles.details}
                    >
                        <Text style={styles.detailsTitle}>Деталі за {MONTHS[selectedMonth.month - 1]}</Text>
                        <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>Всього витрачено:</Text>
                            <Text style={styles.detailsValue}>{selectedMonth.total_spent.toFixed(2)} ₴</Text>
                        </View>
                        <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>Зекономлено:</Text>
                            <Text style={styles.detailsValueSuccess}>{selectedMonth.total_saved.toFixed(2)} ₴ ✨</Text>
                        </View>
                        <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>Походів у магазин:</Text>
                            <Text style={styles.detailsValue}>{selectedMonth.count}</Text>
                        </View>
                    </LinearGradient>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgPrimary },
    center: { justifyContent: 'center', alignItems: 'center' },
    yearSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.bgSecondary,
        gap: SPACING.xl,
    },
    yearText: { ...FONTS.title, fontSize: 24, color: COLORS.textPrimary },
    scroll: { padding: SPACING.md },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        justifyContent: 'space-between',
    },
    monthCard: {
        width: '31%',
        aspectRatio: 1,
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    monthCardActive: {
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(56, 189, 248, 0.05)',
        ...SHADOWS.card,
    },
    monthName: { ...FONTS.medium, fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
    monthTotal: { ...FONTS.bold, fontSize: 14, color: COLORS.textPrimary },
    savingsBadge: {
        marginTop: 4,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        paddingHorizontal: 4,
        borderRadius: RADIUS.xs,
    },
    savingsText: { color: COLORS.success, fontSize: 10, fontWeight: '700' },
    noData: { color: COLORS.textMuted, fontSize: 10 },
    details: {
        marginTop: SPACING.lg,
        padding: SPACING.lg,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.primaryLight,
    },
    detailsTitle: { ...FONTS.bold, fontSize: 18, marginBottom: SPACING.md },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    detailsLabel: { ...FONTS.regular, color: COLORS.textSecondary },
    detailsValue: { ...FONTS.medium, color: COLORS.textPrimary },
    detailsValueSuccess: { ...FONTS.bold, color: COLORS.success },
});
