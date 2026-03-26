/**
 * Skeleton Loader — animated placeholder components for loading states.
 * Matches the Fiscus dark purple/lavender theme with shimmer animation.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

/* ─── Base Skeleton Bone ─── */
export function SkeletonBone({ width = '100%', height = 16, borderRadius = RADIUS.sm, style }) {
    const shimmer = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, {
                    toValue: 0.7,
                    duration: 900,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                }),
                Animated.timing(shimmer, {
                    toValue: 0.3,
                    duration: 900,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: 'rgba(139, 92, 246, 0.12)',
                    opacity: shimmer,
                },
                style,
            ]}
        />
    );
}

/* ─── Product Card Skeleton (list mode) ─── */
export function ProductCardSkeleton() {
    return (
        <View style={styles.productCard}>
            {/* Image */}
            <SkeletonBone width={64} height={64} borderRadius={RADIUS.md} />
            {/* Info */}
            <View style={styles.productInfo}>
                <SkeletonBone width="80%" height={14} />
                <SkeletonBone width="50%" height={10} style={{ marginTop: 6 }} />
                <SkeletonBone width="35%" height={16} style={{ marginTop: 8 }} />
            </View>
            {/* Button */}
            <SkeletonBone width={28} height={28} borderRadius={14} />
        </View>
    );
}

/* ─── Product Card Skeleton (grid mode) ─── */
export function ProductCardGridSkeleton() {
    return (
        <View style={styles.productCardGrid}>
            <SkeletonBone width="100%" height={120} borderRadius={RADIUS.md} />
            <SkeletonBone width="85%" height={13} style={{ marginTop: SPACING.sm }} />
            <SkeletonBone width="55%" height={10} style={{ marginTop: 4 }} />
            <SkeletonBone width="40%" height={16} style={{ marginTop: SPACING.sm }} />
        </View>
    );
}

/* ─── ProductFeed Skeleton (full list) ─── */
export function ProductFeedSkeleton({ count = 6, mode = 'list' }) {
    if (mode === 'grid') {
        const rows = Math.ceil(count / 2);
        return (
            <View style={styles.gridContainer}>
                {Array.from({ length: rows }).map((_, rowIdx) => (
                    <View key={rowIdx} style={styles.gridRow}>
                        <ProductCardGridSkeleton />
                        <ProductCardGridSkeleton />
                    </View>
                ))}
            </View>
        );
    }

    return (
        <View style={styles.listContainer}>
            {Array.from({ length: count }).map((_, i) => (
                <ProductCardSkeleton key={i} />
            ))}
        </View>
    );
}

/* ─── Dashboard Skeleton ─── */
export function DashboardSkeleton() {
    return (
        <View style={styles.dashboardContainer}>
            {/* Promo cards */}
            {[1, 2, 3].map(i => (
                <View key={i} style={styles.promoSkeleton}>
                    <View style={{ flex: 1 }}>
                        <SkeletonBone width="70%" height={14} />
                        <SkeletonBone width="40%" height={10} style={{ marginTop: 6 }} />
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <SkeletonBone width={60} height={18} />
                        <SkeletonBone width={45} height={12} style={{ marginTop: 4 }} />
                    </View>
                </View>
            ))}
        </View>
    );
}

/* ─── Survival Skeleton ─── */
export function SurvivalSkeleton() {
    return (
        <View style={styles.survivalContainer}>
            {/* Total card */}
            <SkeletonBone
                width="100%"
                height={100}
                borderRadius={RADIUS.lg}
                style={{ marginBottom: SPACING.md }}
            />
            {/* Items */}
            {[1, 2, 3, 4].map(i => (
                <View key={i} style={styles.survivalItem}>
                    <SkeletonBone width={36} height={36} borderRadius={RADIUS.sm} />
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                        <SkeletonBone width="65%" height={14} />
                        <SkeletonBone width="40%" height={10} style={{ marginTop: 4 }} />
                    </View>
                    <SkeletonBone width={50} height={14} />
                </View>
            ))}
            {/* Tips */}
            <SkeletonBone
                width="100%"
                height={80}
                borderRadius={RADIUS.md}
                style={{ marginTop: SPACING.md }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    /* Product card list */
    productCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.glass,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
    },
    productInfo: {
        flex: 1,
        marginLeft: SPACING.sm,
        marginRight: SPACING.sm,
    },

    /* Product card grid */
    productCardGrid: {
        flex: 1,
        margin: SPACING.xs,
        padding: SPACING.sm,
        backgroundColor: COLORS.glass,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        borderRadius: RADIUS.lg,
    },

    /* Containers */
    listContainer: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.sm,
    },
    gridContainer: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.sm,
    },
    gridRow: {
        flexDirection: 'row',
    },

    /* Dashboard */
    dashboardContainer: {
        paddingHorizontal: SPACING.lg,
    },
    promoSkeleton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.glass,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
    },

    /* Survival */
    survivalContainer: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
    },
    survivalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.glass,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
    },
});

export default {
    SkeletonBone,
    ProductCardSkeleton,
    ProductCardGridSkeleton,
    ProductFeedSkeleton,
    DashboardSkeleton,
    SurvivalSkeleton,
};
