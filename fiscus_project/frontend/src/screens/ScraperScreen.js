/**
 * ScraperScreen — admin panel for managing scrapers.
 * Shows status of all chains, live logs, and run controls.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import apiClient from '../api/client';

const POLL_INTERVAL_MS = 2000; // poll logs every 2s while running

// Chain color map
const CHAIN_COLORS = {
    atb:        '#e74c3c',
    silpo:      '#f39c12',
    auchan:     '#27ae60',
};

const ChainCard = ({ chain, onRun }) => {
    const color = CHAIN_COLORS[chain.slug] || COLORS.primary;
    const hasProducts = chain.products_in_stock > 0;
    const lastScrape = chain.last_scrape
        ? new Date(chain.last_scrape).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        : 'Ніколи';

    return (
        <View style={[styles.chainCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
            <View style={styles.chainHeader}>
                <View style={styles.chainInfo}>
                    <Text style={styles.chainName}>{chain.chain}</Text>
                    <Text style={styles.chainSlug}>{chain.slug}</Text>
                </View>
                {chain.has_scraper && (
                    <TouchableOpacity
                        style={[styles.runChainBtn, { backgroundColor: color }]}
                        onPress={() => onRun(chain.slug)}
                    >
                        <Text style={styles.runChainBtnText}>Запуск</Text>
                    </TouchableOpacity>
                )}
                {!chain.has_scraper && (
                    <View style={styles.noScraperBadge}>
                        <Text style={styles.noScraperText}>Немає скрепера</Text>
                    </View>
                )}
            </View>
            <View style={styles.chainStats}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{chain.products_in_stock.toLocaleString()}</Text>
                    <Text style={styles.statLabel}>товарів</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{chain.prices_last_24h.toLocaleString()}</Text>
                    <Text style={styles.statLabel}>цін/24г</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{chain.stores?.length || 0}</Text>
                    <Text style={styles.statLabel}>магазинів</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { fontSize: 10 }]}>{lastScrape}</Text>
                    <Text style={styles.statLabel}>останній запуск</Text>
                </View>
            </View>
        </View>
    );
};

export default function ScraperScreen({ navigation }) {
    const [status, setStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [running, setRunning] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const logScrollRef = useRef(null);
    const pollRef = useRef(null);

    const fetchStatus = useCallback(async () => {
        try {
            const data = await apiClient.get('/status/');
            setStatus(data);
            setRunning(data.scraper_running || false);
        } catch (e) {
            setError('Не вдалося підключитися до сервера');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchLogs = useCallback(async () => {
        try {
            const data = await apiClient.get('/scraper/logs/');
            setLogs(data.logs || []);
            setRunning(data.running || false);
        } catch (e) {
            // silent
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, []);

    // Poll logs while scraper is running
    useEffect(() => {
        if (running) {
            pollRef.current = setInterval(fetchLogs, POLL_INTERVAL_MS);
        } else {
            clearInterval(pollRef.current);
            if (logs.length > 0) {
                // Final status refresh after completion
                setTimeout(fetchStatus, 1000);
            }
        }
        return () => clearInterval(pollRef.current);
    }, [running]);

    // Auto-scroll logs to bottom
    useEffect(() => {
        if (logScrollRef.current && logs.length > 0) {
            setTimeout(() => logScrollRef.current?.scrollToEnd?.({ animated: true }), 100);
        }
    }, [logs]);

    const handleRunAll = async () => {
        await handleRun('all');
    };

    const handleRun = async (chain) => {
        if (running) return;
        setLogs([]);
        setRunning(true);
        try {
            await apiClient.post('/scraper/run/', { chain });
            // Start polling immediately
            fetchLogs();
            pollRef.current = setInterval(fetchLogs, POLL_INTERVAL_MS);
        } catch (e) {
            setRunning(false);
            setLogs([`[ПОМИЛКА] ${e.message}`]);
        }
    };

    const getLogColor = (line) => {
        if (line.includes('[ПОМИЛКА]') || line.includes('[КРИТИЧНА')) return '#e74c3c';
        if (line.includes('===')) return COLORS.accent;
        if (line.includes('---')) return COLORS.primary;
        if (line.includes('ЗБЕРЕЖЕННЯ') || line.includes('SAVE')) return '#27ae60';
        if (line.includes('ПРОПУСК') || line.includes('SKIP')) return COLORS.textMuted;
        return COLORS.textPrimary;
    };

    return (
        <View style={Platform.OS === 'web'
            ? { height: '100vh', backgroundColor: COLORS.bgPrimary, overflow: 'hidden' }
            : { flex: 1, backgroundColor: COLORS.bgPrimary }
        }>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={Platform.OS === 'web'}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backBtnText}>← Назад</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Управління скреперами</Text>
                    <Text style={styles.headerSub}>Збір даних з магазинів Львова</Text>
                </View>

                {loading ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Підключення до сервера...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centerBox}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={fetchStatus}>
                            <Text style={styles.retryText}>Спробувати знову</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* Global stats */}
                        <View style={styles.statsRow}>
                            <View style={styles.globalStat}>
                                <Text style={styles.globalStatValue}>{status?.total_products?.toLocaleString() || 0}</Text>
                                <Text style={styles.globalStatLabel}>Продуктів</Text>
                            </View>
                            <View style={styles.globalStat}>
                                <Text style={styles.globalStatValue}>{status?.total_prices?.toLocaleString() || 0}</Text>
                                <Text style={styles.globalStatLabel}>Цін</Text>
                            </View>
                            <View style={styles.globalStat}>
                                <Text style={styles.globalStatValue}>{status?.total_stores || 0}</Text>
                                <Text style={styles.globalStatLabel}>Магазинів</Text>
                            </View>
                            <View style={styles.globalStat}>
                                <Text style={[styles.globalStatValue, { color: running ? '#27ae60' : COLORS.textMuted }]}>
                                    {running ? 'Активний' : 'Зупинено'}
                                </Text>
                                <Text style={styles.globalStatLabel}>Статус</Text>
                            </View>
                        </View>

                        {/* Run all button */}
                        <View style={styles.section}>
                            <TouchableOpacity
                                style={[styles.runAllBtn, running && styles.runAllBtnDisabled]}
                                onPress={handleRunAll}
                                disabled={running}
                                activeOpacity={0.8}
                            >
                                {running ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <ActivityIndicator size="small" color="#fff" />
                                        <Text style={styles.runAllText}>Парсинг виконується...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.runAllText}>Запустити всі скрепери</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Live Log Terminal */}
                        {(logs.length > 0 || running) && (
                            <View style={styles.section}>
                                <View style={styles.terminalHeader}>
                                    <Text style={styles.terminalTitle}>Лог парсингу</Text>
                                    {running && <View style={styles.liveDot} />}
                                    {running && <Text style={styles.liveText}>LIVE</Text>}
                                </View>
                                <View style={styles.terminal}>
                                    <ScrollView
                                        ref={logScrollRef}
                                        style={styles.terminalScroll}
                                        showsVerticalScrollIndicator
                                        nestedScrollEnabled
                                    >
                                        {logs.length === 0 ? (
                                            <Text style={styles.terminalLine}>Очікування виводу...</Text>
                                        ) : (
                                            logs.map((line, i) => (
                                                <Text
                                                    key={i}
                                                    style={[styles.terminalLine, { color: getLogColor(line) }]}
                                                >
                                                    {line}
                                                </Text>
                                            ))
                                        )}
                                        {running && (
                                            <Text style={[styles.terminalLine, { color: COLORS.primary }]}>
                                                {'_'}
                                            </Text>
                                        )}
                                    </ScrollView>
                                </View>
                                <TouchableOpacity
                                    style={styles.clearBtn}
                                    onPress={() => setLogs([])}
                                >
                                    <Text style={styles.clearBtnText}>Очистити лог</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Chain cards */}
                        <Text style={styles.sectionTitle}>Мережі магазинів</Text>
                        <View style={styles.section}>
                            {(status?.chains || []).map((chain) => (
                                <ChainCard
                                    key={chain.slug}
                                    chain={chain}
                                    onRun={handleRun}
                                />
                            ))}
                        </View>
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: COLORS.bgCard,
        padding: SPACING.lg,
        paddingTop: SPACING.xxl,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backBtn: { marginBottom: SPACING.sm },
    backBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
    headerTitle: { ...FONTS.title, fontSize: 22 },
    headerSub: { color: COLORS.textMuted, fontSize: 13, marginTop: 3 },

    centerBox: { alignItems: 'center', padding: SPACING.xxl },
    loadingText: { color: COLORS.textMuted, marginTop: SPACING.md },
    errorText: { color: COLORS.error, textAlign: 'center', marginBottom: SPACING.md },
    retryBtn: {
        backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    retryText: { color: '#fff', fontWeight: '600' },

    statsRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingVertical: SPACING.md,
    },
    globalStat: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        borderRightWidth: 1,
        borderRightColor: COLORS.border,
    },
    globalStatValue: { ...FONTS.bold, fontSize: 20, color: COLORS.primary },
    globalStatLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },

    section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.md },
    sectionTitle: {
        ...FONTS.sectionTitle,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.sm,
    },

    runAllBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.md + 4,
        alignItems: 'center',
        ...SHADOWS.card,
    },
    runAllBtnDisabled: { backgroundColor: COLORS.textMuted },
    runAllText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    // Terminal
    terminalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        gap: SPACING.sm,
    },
    terminalTitle: { ...FONTS.bold, fontSize: 14 },
    liveDot: {
        width: 8, height: 8, borderRadius: 4, backgroundColor: '#e74c3c',
    },
    liveText: { fontSize: 11, fontWeight: '700', color: '#e74c3c' },
    terminal: {
        backgroundColor: '#0d1117',
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: '#30363d',
        height: 320,
    },
    terminalScroll: { flex: 1 },
    terminalLine: {
        fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
        fontSize: 11,
        lineHeight: 18,
        color: '#c9d1d9',
        marginBottom: 1,
    },
    clearBtn: {
        marginTop: SPACING.sm,
        alignSelf: 'flex-end',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.bgSecondary,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    clearBtnText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },

    // Chain cards
    chainCard: {
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.card,
    },
    chainHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    chainInfo: { flex: 1 },
    chainName: { ...FONTS.bold, fontSize: 15 },
    chainSlug: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
    runChainBtn: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs + 2,
        borderRadius: RADIUS.sm,
    },
    runChainBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    noScraperBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.bgSecondary,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    noScraperText: { fontSize: 11, color: COLORS.textMuted },
    chainStats: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.sm,
        gap: SPACING.sm,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { ...FONTS.bold, fontSize: 14, color: COLORS.primary },
    statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
});
