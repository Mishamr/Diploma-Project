/**
 * CalendarWidget — simple monthly calendar with activity dots.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

export default function CalendarWidget({ history = [], defaultMonth, defaultYear }) {
    const now = new Date();
    const [viewDate, setViewDate] = useState(
        new Date(defaultYear || now.getFullYear(), defaultMonth ?? now.getMonth(), 1)
    );

    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();

    const activeDays = useMemo(() => {
        return history
            .filter(h => {
                const d = new Date(h.date);
                return d.getMonth() === m && d.getFullYear() === y;
            })
            .map(h => new Date(h.date).getDate());
    }, [history, m, y]);

    const cells = useMemo(() => {
        const firstDay = new Date(y, m, 1).getDay();
        const offset = firstDay === 0 ? 6 : firstDay - 1;
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const result = [];

        for (let i = 0; i < offset; i++) result.push(null);
        for (let d = 1; d <= daysInMonth; d++) result.push(d);
        return result;
    }, [m, y]);

    const monthNames = [
        'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
        'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень',
    ];

    const handlePrevMonth = () => setViewDate(new Date(y, m - 1, 1));
    const handleNextMonth = () => setViewDate(new Date(y, m + 1, 1));

    return (
        <View style={styles.container}>
            <View style={styles.headerControls}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowBtn}>
                    <Text style={styles.arrowText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{monthNames[m]} {y}</Text>
                <TouchableOpacity onPress={handleNextMonth} style={styles.arrowBtn}>
                    <Text style={styles.arrowText}>›</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.headerRow}>
                {DAYS.map(d => (
                    <View key={d} style={styles.cell}>
                        <Text style={styles.dayHeader}>{d}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.grid}>
                {cells.map((day, idx) => (
                    <View key={idx} style={styles.cell}>
                        {day ? (
                            <View style={[
                                styles.dayCircle,
                                activeDays.includes(day) && styles.dayActive,
                                day === now.getDate() && m === now.getMonth() && styles.dayToday,
                            ]}>
                                <Text style={[
                                    styles.dayText,
                                    activeDays.includes(day) && styles.dayTextActive,
                                ]}>
                                    {day}
                                </Text>
                                {activeDays.includes(day) && <View style={styles.dot} />}
                            </View>
                        ) : null}
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.glass,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
    },
    headerControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    monthTitle: {
        ...FONTS.sectionTitle,
    },
    arrowBtn: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 4,
    },
    arrowText: {
        fontSize: 24,
        color: COLORS.primary,
        fontWeight: '300',
    },
    headerRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    cell: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayHeader: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '600',
    },
    dayCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayActive: {
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
    },
    dayToday: {
        borderWidth: 1.5,
        borderColor: COLORS.primary,
    },
    dayText: {
        color: COLORS.textSecondary,
        fontSize: 13,
    },
    dayTextActive: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    dot: {
        position: 'absolute',
        bottom: 2,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.accent,
    },
});
