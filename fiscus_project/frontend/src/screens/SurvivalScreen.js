/**
 * @fileoverview Survival Mode Screen.
 * 
 * Generates an optimized survival menu based on budget.
 * Features:
 * - Budget Remaining Tracker
 * - Weekly Meal Plan
 * - Input for generating new plans
 * 
 * @module screens/SurvivalScreen
 */

import React, { useState, useContext } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { theme, colors, spacing, typography } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// API
import { generateSurvivalMenu } from '../api/client';

export default function SurvivalScreen({ navigation }) {
    const [budget, setBudget] = useState('500');
    const [days, setDays] = useState('7');
    const [loading, setLoading] = useState(false);
    const [menuData, setMenuData] = useState(null);

    // Active plan state
    const [hasActivePlan, setHasActivePlan] = useState(false);

    const handleGenerate = async () => {
        const budgetNum = parseFloat(budget);
        const daysNum = parseInt(days);

        if (isNaN(budgetNum) || budgetNum <= 0) {
            Alert.alert('Error', 'Please enter a valid budget');
            return;
        }
        if (isNaN(daysNum) || daysNum <= 0 || daysNum > 30) {
            Alert.alert('Error', 'Days must be between 1 and 30');
            return;
        }

        setLoading(true);
        try {
            const response = await generateSurvivalMenu(budgetNum, daysNum);
            setMenuData(response.data);
            setHasActivePlan(true);
        } catch (error) {
            console.error('Failed to generate menu:', error);
            Alert.alert('Error', 'Failed to generate menu. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout title="Survival Mode">
            <ScrollView contentContainerStyle={styles.content}>

                {/* Active Plan View */}
                {hasActivePlan && menuData ? (
                    <>
                        <LinearGradient
                            colors={['rgba(74, 222, 128, 0.2)', 'rgba(74, 222, 128, 0.05)']}
                            style={styles.activePlanCard}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="shield-checkmark" size={24} color={colors.success} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardTitle}>Survival Mode</Text>
                                    <Text style={styles.cardSubtitle}>Premium Feature</Text>
                                </View>
                            </View>

                            <View style={styles.budgetDisplay}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={styles.label}>Weekly Budget</Text>
                                    <TouchableOpacity onPress={() => { setHasActivePlan(false); setMenuData(null); }}>
                                        <Text style={styles.editLink}>Edit</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.budgetValue}>₴{menuData.budget.toFixed(2)}</Text>
                                <Text style={styles.budgetMeta}>For {menuData.days} days of meals</Text>
                            </View>

                            <View style={styles.trackerContainer}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={styles.trackerLabel}>Budget Remaining</Text>
                                    <Text style={[styles.trackerLabel, { color: colors.success, fontWeight: 'bold' }]}>
                                        ₴{(menuData.budget - menuData.total_cost).toFixed(2)}
                                    </Text>
                                </View>
                                <View style={styles.progressBarBg}>
                                    <View style={[styles.progressBarFill, { width: `${((menuData.budget - menuData.total_cost) / menuData.budget * 100).toFixed(1)}%` }]} />
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                    <Text style={styles.trackerMeta}>Spent: ₴{menuData.total_cost.toFixed(2)}</Text>
                                    <Text style={styles.trackerMeta}>{((menuData.budget - menuData.total_cost) / menuData.budget * 100).toFixed(1)}% left</Text>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
                                <Text style={styles.buttonText}>Regenerate Meal Plan</Text>
                            </TouchableOpacity>
                        </LinearGradient>

                        <Card style={styles.mealPlanCard}>
                            <Text style={styles.sectionHeader}>
                                <Ionicons name="cart-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                                Shopping List ({menuData.items?.length || 0} items)
                            </Text>

                            {menuData.items?.map((item, index) => (
                                <View key={index} style={styles.dayCard}>
                                    <View style={styles.dayHeader}>
                                        <Text style={styles.dayTitle}>{item.product_name}</Text>
                                        <Text style={styles.dayCost}>₴{item.total_price.toFixed(2)}</Text>
                                    </View>
                                    <View style={styles.mealRow}>
                                        <Ionicons name="storefront-outline" size={14} color={colors.textMuted} />
                                        <Text style={styles.mealText}>{item.store_name}</Text>
                                    </View>
                                    <View style={styles.mealRow}>
                                        <Ionicons name="pricetag-outline" size={14} color={colors.textMuted} />
                                        <Text style={styles.mealText}>₴{item.price_per_unit.toFixed(2)} × {item.quantity}</Text>
                                    </View>
                                </View>
                            ))}

                            {(!menuData.items || menuData.items.length === 0) && (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="alert-circle-outline" size={32} color={colors.textMuted} />
                                    <Text style={styles.emptyText}>No items found in your budget range</Text>
                                </View>
                            )}
                        </Card>
                    </>
                ) : (
                    // Input Form
                    <Card style={styles.inputCard}>
                        <View style={{ alignItems: 'center', marginBottom: spacing.l }}>
                            <View style={styles.largeIcon}>
                                <Ionicons name="shield-checkmark" size={48} color={colors.success} />
                            </View>
                            <Text style={styles.title}>Survival Mode</Text>
                            <Text style={styles.subtitle}>Set your budget, survive the week.</Text>
                        </View>

                        <Text style={styles.inputLabel}>Weekly Budget ($)</Text>
                        <TextInput
                            style={styles.input}
                            value={budget}
                            onChangeText={setBudget}
                            keyboardType="numeric"
                            placeholder="50.00"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={styles.inputLabel}>Duration (Days)</Text>
                        <TextInput
                            style={styles.input}
                            value={days}
                            onChangeText={setDays}
                            keyboardType="numeric"
                            placeholder="7"
                            placeholderTextColor={colors.textMuted}
                        />

                        <TouchableOpacity
                            style={styles.generateButton}
                            onPress={handleGenerate}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.background} />
                            ) : (
                                <Text style={styles.buttonText}>Generate Meal Plan</Text>
                            )}
                        </TouchableOpacity>
                    </Card>
                )}

            </ScrollView>
        </Layout>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: spacing.m,
    },
    activePlanCard: {
        borderRadius: theme.borderRadius.xl,
        padding: spacing.m,
        borderWidth: 2,
        borderColor: colors.success,
        marginBottom: spacing.m,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.m,
        marginBottom: spacing.m,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: theme.borderRadius.l,
        backgroundColor: 'rgba(74, 222, 128, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: theme.fontSize.subtitle,
        fontWeight: 'bold',
        color: colors.text,
    },
    cardSubtitle: {
        fontSize: theme.fontSize.small,
        color: colors.textMuted,
    },
    budgetDisplay: {
        backgroundColor: 'rgba(26, 15, 46, 0.5)', // deep purple with opacity
        borderRadius: theme.borderRadius.l,
        padding: spacing.m,
        marginBottom: spacing.m,
    },
    label: {
        fontSize: theme.fontSize.small,
        color: colors.textMuted,
    },
    editLink: {
        fontSize: theme.fontSize.small,
        color: colors.primary,
        fontWeight: '600',
    },
    budgetValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.text,
        marginVertical: 4,
    },
    budgetMeta: {
        fontSize: theme.fontSize.small,
        color: colors.textMuted,
    },
    trackerContainer: {
        marginBottom: spacing.m,
    },
    trackerLabel: {
        fontSize: theme.fontSize.small,
        fontWeight: 'medium',
        color: colors.text,
    },
    progressBarBg: {
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.surfaceLight,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.success,
        borderRadius: 6,
    },
    trackerMeta: {
        fontSize: 10,
        color: colors.textMuted,
    },
    generateButton: {
        backgroundColor: colors.success,
        paddingVertical: spacing.m,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
    },
    buttonText: {
        color: colors.background,
        fontWeight: 'bold',
        fontSize: theme.fontSize.body,
    },
    mealPlanCard: {
        padding: spacing.m,
    },
    sectionHeader: {
        fontSize: theme.fontSize.body,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.m,
    },
    dayCard: {
        backgroundColor: colors.surfaceLight,
        borderRadius: theme.borderRadius.m,
        padding: spacing.m,
        marginBottom: spacing.s,
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.s,
    },
    dayTitle: {
        fontWeight: 'bold',
        color: colors.text,
    },
    dayCost: {
        fontWeight: 'bold',
        color: colors.success,
        fontSize: theme.fontSize.small,
    },
    mealRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    mealText: {
        fontSize: theme.fontSize.small,
        color: colors.textMuted,
    },
    viewAllButton: {
        marginTop: spacing.s,
        paddingVertical: spacing.s,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: theme.borderRadius.m,
    },
    viewAllText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: theme.fontSize.small,
    },
    inputCard: {
        padding: spacing.l,
    },
    largeIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.m,
    },
    title: {
        fontSize: theme.fontSize.headline,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: theme.fontSize.body,
        color: colors.textMuted,
    },
    inputLabel: {
        color: colors.textSecondary,
        marginBottom: spacing.s,
        marginTop: spacing.m,
        fontWeight: '600',
    },
    input: {
        backgroundColor: colors.background,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.text,
        padding: spacing.m,
        fontSize: 16,
    },
});
