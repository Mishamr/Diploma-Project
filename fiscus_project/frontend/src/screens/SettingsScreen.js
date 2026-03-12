/**
 * Settings screen вЂ” user preferences for product display, stores, budget.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Switch,
    StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import { CHAINS } from '../constants/stores';

export default function SettingsScreen({ navigation }) {
    const { user, logout } = useAuth();
    const {
        viewMode,
        budget,
        enabledChains,
        updateViewMode,
        updateBudget,
        toggleChain
    } = useSettings();



    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
        >
            {/* Header */}
            <LinearGradient
                colors={COLORS.gradientGemini}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <Icon name="settings" size={28} color="#fff" />
                <Text style={styles.headerTitle}>Керування акаунтом</Text>
                <Text style={styles.headerSub}>
                    {user?.username || 'Гість'}
                </Text>
            </LinearGradient>

            {/* Display mode */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🖼 Відображення</Text>
                <GlassCard style={styles.optionRow}>
                    <Text style={styles.optionLabel}>Вигляд товарів</Text>
                    <View style={styles.toggleGroup}>
                        <TouchableOpacity
                            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleActive]}
                            onPress={() => updateViewMode('list')}
                        >
                            <Icon name="list" size={18} color={viewMode === 'list' ? '#fff' : COLORS.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleActive]}
                            onPress={() => updateViewMode('grid')}
                        >
                            <Icon name="grid" size={18} color={viewMode === 'grid' ? '#fff' : COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>
                </GlassCard>
            </View>



            {/* Budget */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>💰 Місячний бюджет</Text>
                <GlassCard style={styles.optionRow}>
                    <Text style={styles.optionLabel}>Бюджет</Text>
                    <View style={styles.stepper}>
                        <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => updateBudget(Math.max(1000, parseInt(budget) - 500))}
                        >
                            <Icon name="remove" size={16} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        <Text style={styles.stepValue}>{budget} ₴</Text>
                        <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => updateBudget(parseInt(budget) + 500)}
                        >
                            <Icon name="add" size={16} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </GlassCard>
            </View>

            {/* Preferred chains */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🏪 Обрані мережі</Text>
                {CHAINS.map(chain => (
                    <GlassCard key={chain.slug} style={styles.chainRow}>
                        <Text style={styles.chainIcon}>{chain.icon}</Text>
                        <Text style={styles.chainName}>{chain.name}</Text>
                        <Switch
                            value={enabledChains[chain.slug]}
                            onValueChange={() => toggleChain(chain.slug)}
                            trackColor={{ false: COLORS.bgInput, true: COLORS.primaryLight }}
                            thumbColor={enabledChains[chain.slug] ? COLORS.primary : COLORS.textMuted}
                        />
                    </GlassCard>
                ))}
            </View>

            {/* Logout */}
            <View style={styles.section}>
                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                    <Icon name="log-out-outline" size={20} color={COLORS.error} />
                    <Text style={styles.logoutText}>Вийти з акаунту</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgPrimary },
    header: {
        padding: SPACING.lg,
        paddingTop: SPACING.xxl,
        alignItems: 'center',
        borderBottomLeftRadius: RADIUS.xl,
        borderBottomRightRadius: RADIUS.xl,
    },
    headerTitle: { ...FONTS.title, color: '#fff', marginTop: SPACING.sm },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
    section: {
        paddingHorizontal: SPACING.lg,
        marginTop: SPACING.lg,
    },
    sectionTitle: {
        ...FONTS.sectionTitle,
        marginBottom: SPACING.sm,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    optionLabel: { ...FONTS.medium, fontSize: 14 },
    toggleGroup: {
        flexDirection: 'row',
        backgroundColor: COLORS.bgInput,
        borderRadius: RADIUS.sm,
        overflow: 'hidden',
    },
    toggleBtn: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    toggleActive: {
        backgroundColor: COLORS.primary,
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    stepBtn: {
        padding: 8,
        backgroundColor: COLORS.bgInput,
        borderRadius: RADIUS.sm,
    },
    stepValue: {
        ...FONTS.bold,
        fontSize: 16,
        minWidth: 50,
        textAlign: 'center',
    },
    chainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    chainIcon: { fontSize: 20, marginRight: SPACING.md },
    chainName: { ...FONTS.medium, fontSize: 14, flex: 1 },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(244, 63, 94, 0.2)',
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        gap: SPACING.sm,
    },
    logoutText: {
        color: COLORS.error,
        fontWeight: '600',
        fontSize: 15,
    },
});

