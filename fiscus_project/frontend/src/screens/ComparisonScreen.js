import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getDashboardStats, getShoppingLists } from '../api/client';

const DashboardScreen = ({ navigation }) => {
    const [stats, setStats] = useState({
        active_lists: 0,
        stores_tracked: 0,
        savings_this_month: 0,
        savings_trend: 0,
        user_name: 'Користувач',
        recent_lists: []
    });
    const [loading, setLoading] = useState(true);
    const [lists, setLists] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, listsRes] = await Promise.all([
                    getDashboardStats(),
                    getShoppingLists()
                ]);
                setStats(statsRes.data);
                setLists(listsRes.data?.slice(0, 2) || []);
            } catch (error) {
                console.error('Failed to load dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <Layout title="Dashboard">
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </Layout>
        );
    }

    return (
        <Layout title="Dashboard">
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Hero Section */}
                <View style={styles.section}>
                    <View style={styles.heroHeader}>
                        <Text style={styles.welcomeText}>Вітаємо, {stats.user_name}!</Text>
                        <Text style={styles.subText}>Економте на покупках сьогодні</Text>
                    </View>

                    {/* Savings Widget */}
                    <LinearGradient
                        colors={theme.colors.gradientPrimary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.savingsCard}
                    >
                        <View style={styles.savingsHeader}>
                            <View>
                                <Text style={styles.savingsLabel}>Економія цього місяця</Text>
                                <Text style={styles.savingsAmount}>₴{stats.savings_this_month.toFixed(2)}</Text>
                            </View>
                            <View style={styles.piggyIcon}>
                                <Ionicons name="wallet" size={24} color={theme.colors.background} />
                            </View>
                        </View>
                        <View style={styles.savingsFooter}>
                            <View style={styles.trendBadge}>
                                <Ionicons name="arrow-up" size={12} color={theme.colors.background} />
                                <Text style={styles.trendText}>{stats.savings_trend}%</Text>
                            </View>
                            <Text style={styles.trendLabel}>vs минулий місяць</Text>
                        </View>
                    </LinearGradient>

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <Card style={styles.statCard}>
                            <View style={styles.statIconContainer}>
                                <Ionicons name="basket" size={20} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.statLabel}>Активні списки</Text>
                            <Text style={styles.statValue}>{stats.active_lists}</Text>
                        </Card>
                        <Card style={styles.statCard}>
                            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.surfaceLight }]}>
                                <Ionicons name="storefront" size={20} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.statLabel}>Магазинів</Text>
                            <Text style={styles.statValue}>{stats.stores_tracked}</Text>
                        </Card>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Швидкі дії</Text>
                    <View style={styles.actionsGrid}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('ShoppingList')}>
                            <LinearGradient
                                colors={theme.colors.gradientPrimary}
                                style={styles.actionIcon}
                            >
                                <Ionicons name="add" size={24} color={theme.colors.background} />
                            </LinearGradient>
                            <Text style={styles.actionTitle}>Новий список</Text>
                            <Text style={styles.actionDesc}>Порівняти ціни</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('ProductFeed')}>
                            <View style={[styles.actionIcon, { backgroundColor: theme.colors.surfaceLight }]}>
                                <Ionicons name="search-outline" size={24} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.actionTitle}>Пошук</Text>
                            <Text style={styles.actionDesc}>Знайти товар</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Survival')}>
                            <View style={[styles.actionIcon, { backgroundColor: theme.colors.surfaceLight }]}>
                                <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.success} />
                            </View>
                            <Text style={styles.actionTitle}>Survival Mode</Text>
                            <Text style={styles.actionDesc}>Бюджет план</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Map')}>
                            <View style={[styles.actionIcon, { backgroundColor: theme.colors.surfaceLight }]}>
                                <Ionicons name="location-outline" size={24} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.actionTitle}>Магазини</Text>
                            <Text style={styles.actionDesc}>Поблизу</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Shopping Lists */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Ваші списки покупок</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('ShoppingList')}>
                            <Text style={styles.linkText}>Всі</Text>
                        </TouchableOpacity>
                    </View>

                    {lists.length === 0 ? (
                        <Card style={styles.listCard}>
                            <View style={styles.emptyContainer}>
                                <Ionicons name="basket-outline" size={48} color={theme.colors.textMuted} />
                                <Text style={styles.emptyText}>Ще немає списків покупок</Text>
                                <TouchableOpacity
                                    style={styles.primaryButton}
                                    onPress={() => navigation.navigate('ShoppingList')}
                                >
                                    <Text style={styles.primaryButtonText}>Створити перший список</Text>
                                </TouchableOpacity>
                            </View>
                        </Card>
                    ) : (
                        lists.map((list) => (
                            <Card key={list.id} style={styles.listCard}>
                                <View style={styles.listHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.listTitle}>{list.name}</Text>
                                        <Text style={styles.listMeta}>
                                            {list.total_items || 0} товарів • {new Date(list.created_at).toLocaleDateString('uk-UA')}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => navigation.navigate('ShoppingList', { listId: list.id })}>
                                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.listDetails}>
                                    <View>
                                        <Text style={styles.detailLabel}>Найкраща ціна в</Text>
                                        <Text style={styles.detailValueSuccess}>
                                            {list.best_store || 'Аналіз...'}
                                            {list.distance ? ` • ${list.distance.toFixed(1)} км` : ''}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.detailLabel}>Всього</Text>
                                        <Text style={[styles.detailValueSuccess, { fontSize: theme.fontSize.title }]}>
                                            ₴{(list.total_price || 0).toFixed(2)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.progressBarBg}>
                                    <View style={[styles.progressBarFill, { width: `${list.progress || 0}%` }]} />
                                </View>
                                <Text style={styles.progressText}>{list.progress || 0}%</Text>

                                <TouchableOpacity
                                    style={styles.primaryButton}
                                    onPress={() => navigation.navigate('Map', { shoppingListId: list.id })}
                                >
                                    <Text style={styles.primaryButtonText}>Порівняти всі магазини</Text>
                                </TouchableOpacity>
                            </Card>
                        ))
                    )}
                </View>

                <View style={{ height: 80 }} />
            </ScrollView>
        </Layout>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        padding: theme.spacing.m,
    },
    section: {
        marginBottom: theme.spacing.l,
    },
    heroHeader: {
        marginBottom: theme.spacing.m,
    },
    welcomeText: {
        fontSize: theme.fontSize.headline,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    subText: {
        fontSize: theme.fontSize.caption,
        color: theme.colors.textMuted,
        marginTop: 4,
    },
    savingsCard: {
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.l,
        marginBottom: theme.spacing.m,
    },
    savingsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.m,
    },
    savingsLabel: {
        color: theme.colors.background,
        fontSize: theme.fontSize.caption,
        fontWeight: theme.fontWeight.medium,
        opacity: 0.9,
    },
    savingsAmount: {
        color: theme.colors.background,
        fontSize: theme.fontSize.display,
        fontWeight: theme.fontWeight.heavy,
    },
    piggyIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    savingsFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(74, 222, 128, 0.2)', // translucent green
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.s,
        gap: 4,
    },
    trendText: {
        color: theme.colors.background,
        fontWeight: theme.fontWeight.bold,
        fontSize: theme.fontSize.small,
    },
    trendLabel: {
        color: theme.colors.background,
        fontSize: theme.fontSize.small,
        opacity: 0.8,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: theme.spacing.m,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.m,
        backgroundColor: theme.colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.s,
    },
    statLabel: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.small,
        marginBottom: 4,
    },
    statValue: {
        color: theme.colors.text,
        fontSize: theme.fontSize.title,
        fontWeight: theme.fontWeight.bold,
    },
    sectionTitle: {
        color: theme.colors.text,
        fontSize: theme.fontSize.subtitle,
        fontWeight: theme.fontWeight.bold,
        marginBottom: theme.spacing.m,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    linkText: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.caption,
        fontWeight: theme.fontWeight.medium,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.s,
    },
    actionButton: {
        width: '48%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: theme.borderRadius.l,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.s,
    },
    actionTitle: {
        color: theme.colors.text,
        fontWeight: theme.fontWeight.semibold,
        fontSize: theme.fontSize.caption,
        marginBottom: 2,
    },
    actionDesc: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.small,
    },
    listCard: {
        marginBottom: theme.spacing.m,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.m,
    },
    listTitle: {
        color: theme.colors.text,
        fontWeight: theme.fontWeight.semibold,
        fontSize: theme.fontSize.body,
        marginBottom: 4,
    },
    listMeta: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.small,
    },
    listDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.m,
    },
    detailLabel: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.small,
        marginBottom: 4,
    },
    detailValueSuccess: {
        color: theme.colors.success,
        fontWeight: theme.fontWeight.bold,
        fontSize: theme.fontSize.body,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: theme.colors.surfaceLight,
        borderRadius: 4,
        marginBottom: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.success,
    },
    progressText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.small,
        textAlign: 'right',
        marginBottom: theme.spacing.m,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary, // should be gradient in full impl
        paddingVertical: theme.spacing.s + 4,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: theme.colors.background,
        fontWeight: theme.fontWeight.bold,
        fontSize: theme.fontSize.body,
    },
    secondaryButton: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        paddingVertical: theme.spacing.s + 4,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: theme.colors.primary,
        fontWeight: theme.fontWeight.semibold,
        fontSize: theme.fontSize.body,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: theme.spacing.l,
    },
    emptyText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.body,
        marginTop: theme.spacing.m,
        marginBottom: theme.spacing.l,
    },
});

export default DashboardScreen;
