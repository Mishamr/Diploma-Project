/**
 * Settings screen — user profile & account management.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Switch,
    TextInput,
    StyleSheet,
    Alert,
    ActivityIndicator,
    SafeAreaView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import { CHAINS } from '../constants/stores';
import apiClient from '../api/client';

/* ─── Avatar Component ─── */
const UserAvatar = ({ username, size = 80 }) => {
    const initials = (username || 'U')
        .split(/[\s_-]+/)
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    return (
        <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={[
                avatarStyles.container,
                { width: size, height: size, borderRadius: size / 2 },
            ]}
        >
            <Text style={[avatarStyles.initials, { fontSize: size * 0.35 }]}>
                {initials}
            </Text>
        </LinearGradient>
    );
};

const avatarStyles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    initials: {
        color: '#fff',
        fontWeight: '800',
    },
});

/* ─── Editable Field ─── */
const EditableField = ({ label, value, onChangeText, icon, placeholder, editable = true }) => (
    <GlassCard style={styles.fieldCard}>
        <View style={styles.fieldIcon}>
            <Icon name={icon} size={18} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>{label}</Text>
            {editable ? (
                <TextInput
                    style={styles.fieldInput}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textMuted}
                />
            ) : (
                <Text style={styles.fieldValue}>{value || '—'}</Text>
            )}
        </View>
    </GlassCard>
);

export default function SettingsScreen({ navigation }) {
    const { user, logout } = useAuth();
    const {
        viewMode,
        budget,
        enabledChains,
        updateViewMode,
        updateBudget,
        toggleChain,
    } = useSettings();

    const [username, setUsername] = useState(user?.username || '');
    const [email, setEmail] = useState(user?.email || '');
    const [firstName, setFirstName] = useState(user?.first_name || '');
    const [lastName, setLastName] = useState(user?.last_name || '');
    const [saving, setSaving] = useState(false);
    const [profileLoaded, setProfileLoaded] = useState(false);

    // Load profile from server
    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await apiClient.getProfile();
            if (data.username) setUsername(data.username);
            if (data.email) setEmail(data.email);
            if (data.first_name) setFirstName(data.first_name);
            if (data.last_name) setLastName(data.last_name);
        } catch (e) {
            console.warn('Failed to load profile:', e);
        } finally {
            setProfileLoaded(true);
        }
    };

    const handleSaveProfile = useCallback(async () => {
        setSaving(true);
        try {
            await apiClient.updateProfile({
                username: username.trim(),
                email: email.trim(),
                first_name: firstName.trim(),
                last_name: lastName.trim(),
            });
            Alert.alert('✅ Збережено', 'Профіль оновлено');
        } catch (e) {
            Alert.alert('❌ Помилка', e.message || 'Не вдалося зберегти');
        } finally {
            setSaving(false);
        }
    }, [username, email, firstName, lastName]);

    const hasChanges =
        username !== (user?.username || '') ||
        email !== (user?.email || '') ||
        firstName !== (user?.first_name || '') ||
        lastName !== (user?.last_name || '');

    return (
        <View style={Platform.OS === 'web' ? { height: '100vh', backgroundColor: COLORS.bgPrimary, overflow: 'hidden' } : { flex: 1, backgroundColor: COLORS.bgPrimary }}>
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={Platform.OS === 'web'}
                contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
            >
            {/* Header */}
            <LinearGradient
                colors={COLORS.gradientGemini}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                >
                    <Icon name="arrow-back" size={22} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>

                <UserAvatar username={username} size={80} />
                <Text style={styles.headerTitle}>{username || 'Гість'}</Text>
                <Text style={styles.headerSub}>{email || 'Налаштуйте свій акаунт'}</Text>
            </LinearGradient>

            {/* Profile section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>👤 Профіль</Text>

                <EditableField
                    label="Нікнейм"
                    value={username}
                    onChangeText={setUsername}
                    icon="person-outline"
                    placeholder="Ваш нікнейм"
                />
                <EditableField
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    icon="mail-outline"
                    placeholder="email@example.com"
                />
                <EditableField
                    label="Ім'я"
                    value={firstName}
                    onChangeText={setFirstName}
                    icon="text-outline"
                    placeholder="Ваше ім'я"
                />
                <EditableField
                    label="Прізвище"
                    value={lastName}
                    onChangeText={setLastName}
                    icon="text-outline"
                    placeholder="Ваше прізвище"
                />

                {/* Save button */}
                <TouchableOpacity
                    style={[styles.saveBtn, !hasChanges && styles.saveBtnDisabled]}
                    onPress={handleSaveProfile}
                    disabled={saving || !hasChanges}
                    activeOpacity={0.7}
                >
                    <LinearGradient
                        colors={hasChanges ? [COLORS.primary, COLORS.primaryDark] : [COLORS.bgInput, COLORS.bgInput]}
                        style={styles.saveGradient}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Icon name="save-outline" size={18} color={hasChanges ? '#fff' : COLORS.textMuted} />
                                <Text style={[styles.saveText, !hasChanges && { color: COLORS.textMuted }]}>
                                    Зберегти профіль
                                </Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>

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
        </View>
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
    backBtn: {
        position: 'absolute',
        top: SPACING.xxl,
        left: SPACING.lg,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
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

    /* Profile fields */
    fieldCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    fieldIcon: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    fieldLabel: { ...FONTS.caption, marginBottom: 2 },
    fieldInput: {
        ...FONTS.medium,
        fontSize: 15,
        color: COLORS.textPrimary,
        padding: 0,
        minHeight: 24,
    },
    fieldValue: { ...FONTS.medium, fontSize: 15, color: COLORS.textSecondary },

    saveBtn: { marginTop: SPACING.sm, borderRadius: RADIUS.full, overflow: 'hidden' },
    saveBtnDisabled: { opacity: 0.6 },
    saveGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
    },
    saveText: { ...FONTS.bold, color: '#fff', fontSize: 15 },

    /* App settings */
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
