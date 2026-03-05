/**
 * SavingsChart — line chart showing savings over time.
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SavingsChart({ data = [], title = 'Заощадження' }) {
    if (!data.length) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>Недостатньо даних</Text>
            </View>
        );
    }

    const labels = data.map(d => d.label || '');
    const values = data.map(d => d.value || 0);

    const chartConfig = {
        backgroundColor: 'transparent',
        backgroundGradientFrom: COLORS.bgCardSolid,
        backgroundGradientTo: COLORS.bgSecondary,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        labelColor: () => COLORS.textMuted,
        propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: COLORS.accent,
        },
        propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: 'rgba(139, 92, 246, 0.1)',
        },
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <LineChart
                data={{
                    labels: labels.length > 7 ? labels.filter((_, i) => i % 2 === 0) : labels,
                    datasets: [{ data: values }],
                }}
                width={SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2}
                height={180}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={false}
            />
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
    title: {
        ...FONTS.sectionTitle,
        marginBottom: SPACING.sm,
    },
    chart: {
        borderRadius: RADIUS.md,
        marginLeft: -SPACING.sm,
    },
    empty: {
        padding: SPACING.lg,
        alignItems: 'center',
    },
    emptyText: {
        ...FONTS.caption,
        fontSize: 14,
    },
});
