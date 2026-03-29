/**
 * SavingsChart — pure SVG line chart, web-compatible (no react-native-chart-kit).
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

const CHART_HEIGHT = 160;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;

export default function SavingsChart({ data = [], title = 'Заощадження' }) {
    const [chartWidth, setChartWidth] = useState(0);

    if (!data.length) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>Недостатньо даних</Text>
            </View>
        );
    }

    const innerW = chartWidth - PAD_LEFT - PAD_RIGHT;
    const innerH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

    const values = data.map(d => d.value || 0);
    const labels = data.map(d => d.label || '');
    const minV = Math.min(...values);
    const maxV = Math.max(...values) || 1;

    const toX = i => {
        if (values.length < 2) return PAD_LEFT + innerW / 2;
        return PAD_LEFT + (i / (values.length - 1)) * innerW;
    };
    const toY = v => {
        const diff = maxV - minV;
        if (diff === 0) return PAD_TOP + innerH / 2;
        return PAD_TOP + innerH - ((v - minV) / diff) * innerH;
    };

    const points = values.length > 0 
        ? values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')
        : "";

    // Smooth path using cubic bezier
    const pathD = values.reduce((acc, v, i) => {
        const x = toX(i);
        const y = toY(v);
        if (i === 0) return `M ${x} ${y}`;
        const px = toX(i - 1);
        const py = toY(values[i - 1]);
        const cp1x = px + (x - px) / 2;
        return `${acc} C ${cp1x} ${py}, ${cp1x} ${y}, ${x} ${y}`;
    }, '');

    // Fill path
    const fillD = values.length > 1 
        ? `${pathD} L ${toX(values.length - 1)} ${PAD_TOP + innerH} L ${PAD_LEFT} ${PAD_TOP + innerH} Z`
        : "";

    // Y axis ticks
    const yTicks = 4;
    const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
        Math.round(minV + (i / yTicks) * (maxV - minV))
    );

    // Show every Nth label to avoid crowding
    const step = Math.ceil(labels.length / 5);

    return (
        <View 
            style={styles.container} 
            onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - SPACING.md * 2)}
        >
            <Text style={styles.title}>{title}</Text>
            {chartWidth > 0 ? (
                <Svg width={chartWidth} height={CHART_HEIGHT}>
                    <Defs>
                        <SvgGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={COLORS.accent} stopOpacity="0.3" />
                            <Stop offset="1" stopColor={COLORS.accent} stopOpacity="0.02" />
                        </SvgGradient>
                    </Defs>

                    {/* Grid lines */}
                    {yTickValues.map((tick, i) => {
                        const y = toY(tick);
                        return (
                            <React.Fragment key={i}>
                                <Line
                                    x1={PAD_LEFT} y1={y}
                                    x2={chartWidth - PAD_RIGHT} y2={y}
                                    stroke="rgba(139,92,246,0.12)" strokeWidth={1}
                                />
                                <SvgText
                                    x={PAD_LEFT - 4} y={y + 4}
                                    fontSize={9} fill={COLORS.textMuted}
                                    textAnchor="end"
                                >
                                    {tick}
                                </SvgText>
                            </React.Fragment>
                        );
                    })}

                    {/* Fill area */}
                    <Path d={fillD} fill="url(#fill)" />

                    {/* Line */}
                    <Path
                        d={pathD}
                        fill="none"
                        stroke={COLORS.accent}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Dots */}
                    {values.map((v, i) => (
                        <Circle
                            key={i}
                            cx={toX(i)} cy={toY(v)}
                            r={4} fill={COLORS.accent}
                            stroke={COLORS.bg} strokeWidth={2}
                        />
                    ))}

                    {/* X labels */}
                    {labels.map((lbl, i) => {
                        if (i % step !== 0 && i !== labels.length - 1) return null;
                        return (
                            <SvgText
                                key={i}
                                x={toX(i)} y={CHART_HEIGHT - 6}
                                fontSize={9} fill={COLORS.textMuted}
                                textAnchor="middle"
                            >
                                {lbl}
                            </SvgText>
                        );
                    })}
                </Svg>
            ) : null}
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
    empty: {
        padding: SPACING.lg,
        alignItems: 'center',
    },
    emptyText: {
        ...FONTS.caption,
        fontSize: 14,
    },
});
