/**
 * Settings screen — minimalist light-purple theme. No gradients/icons.
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
    Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import { CHAINS } from '../constants/stores';
import apiClient from '../api/client';

/* ─── Avatar ─── */
const UserAvatar = ({ username, size = 80 }) => {
    const initials = (username || 'U')
        .split(/[\s_-]+/)
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    return (
        <View style={[avatarStyles.container, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text style={[avatarStyles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
        </View>
    );
};

const avatarStyles = StyleSheet.create({
    container: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    initials: { color: '#fff', fontWeight: '800' },
});

/* ─── Editable Field ─── */
const EditableField = ({ label, value, onChangeText, placeholder, editable = true }) => (
    <View style={styles.fieldWrapper}>
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
);

export default function SettingsScreen({ navigation }) {
    const { user, logout } = useAuth();
    const { viewMode, budget, enabledChains, updateViewMode, updateBudget, toggleChain } = useSettings();

    const [username, setUsername] = useState(user?.username || '');
    const [email, setEmail] = useState(user?.email || '');
    const [firstName, setFirstName] = useState(user?.first_name || '');
    const [lastName, setLastName] = useState(user?.last_name || '');
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadProfile(); }, []);

    const loadProfile = async () => {
        try {
            const data = await apiClient.getProfile();
            if (data.username) setUsername(data.username);
            if (data.email) setEmail(data.email);
            if (data.first_name) setFirstName(data.first_name);
            if (data.last_name) setLastName(data.last_name);
        } catch (e) {}
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
            Alert.alert('Збережено', 'Профіль оновлено');
        } catch (e) {
            Alert.alert('Помилка', e.message || 'Не вдалося зберегти');
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
        <View style={Platform.OS === 'web'
            ? { height: '100vh', backgroundColor: COLORS.bgPrimary, overflow: 'hidden' }
            : { flex: 1, backgroundColor: COLORS.bgPrimary }
        }>
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={Platform.OS === 'web'}
                contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backBtnText}>← Назад</Text>
                    </TouchableOpacity>
                    <View style={styles.headerProfile}>
                        <UserAvatar username={username} size={72} />
                        <View style={{ marginLeft: SPACING.md }}>
                            <Text style={styles.headerTitle}>{username || 'Гість'}</Text>
                            <Text style={styles.headerSub}>{email || 'Налаштуйте профіль'}</Text>
                        </View>
                    </View>
                </View>

                {/* Profile section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Профіль</Text>
                    <GlassCard style={styles.profileCard}>
                        <EditableField label="Нікнейм" value={username} onChangeText={setUsername} placeholder="Ваш нікнейм" />
                        <View style={styles.fieldDivider} />
                        <EditableField label="Email" value={email} onChangeText={setEmail} placeholder="email@example.com" />
                        <View style={styles.fieldDivider} />
                        <EditableField label="Ім'я" value={firstName} onChangeText={setFirstName} placeholder="Ваше ім'я" />
                        <View style={styles.fieldDivider} />
                        <EditableField label="Прізвище" value={lastName} onChangeText={setLastName} placeholder="Ваше прізвище" />
                    </GlassCard>

                    <TouchableOpacity
                        style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
                        onPress={handleSaveProfile}
                        disabled={saving || !hasChanges}
                    >
                        {saving
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={styles.saveBtnText}>Зберегти профіль</Text>
                        }
                    </TouchableOpacity>
                </View>

                {/* Display mode */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Відображення</Text>
                    <GlassCard style={styles.optionRow}>
                        <Text style={styles.optionLabel}>Вигляд товарів</Text>
                        <View style={styles.toggleGroup}>
                            <TouchableOpacity
                                style={[styles.toggleBtn, viewMode === 'list' && styles.toggleActive]}
                                onPress={() => updateViewMode('list')}
                            >
                                <Text style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}>☰ Список</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleActive]}
                                onPress={() => updateViewMode('grid')}
                            >
                                <Text style={[styles.toggleBtnText, viewMode === 'grid' && styles.toggleBtnTextActive]}>⊞ Сітка</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </View>

                {/* Budget */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Місячний бюджет</Text>
                    <GlassCard style={styles.optionRow}>
                        <Text style={styles.optionLabel}>Бюджет</Text>
                        <View style={styles.stepper}>
                            <TouchableOpacity
                                style={styles.stepBtn}
                                onPress={() => updateBudget(Math.max(1000, parseInt(budget) - 500))}
                            >
                                <Text style={styles.stepBtnText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.stepValue}>{budget} ₴</Text>
                            <TouchableOpacity
                                style={styles.stepBtn}
                                onPress={() => updateBudget(parseInt(budget) + 500)}
                            >
                                <Text style={styles.stepBtnText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </View>

                {/* Preferred chains */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Обрані мережі</Text>
                    {CHAINS.map(chain => (
                        <GlassCard key={chain.slug} style={styles.chainRow}>
                            <Text style={styles.chainIcon}>{chain.icon}</Text>
                            <Text style={styles.chainName}>{chain.name}</Text>
                            <Switch
                                value={enabledChains[chain.slug]}
                                onValueChange={() => toggleChain(chain.slug)}
                                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                                thumbColor={enabledChains[chain.slug] ? COLORS.primary : COLORS.textMuted}
                            />
                        </GlassCard>
                    ))}
                </View>

                {/* Logout */}
                <View style={styles.section}>
                    <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                        <Text style={styles.logoutText}>Вийти з акаунту</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: COLORS.white,
        padding: SPACING.lg,
        paddingTop: SPACING.xxl,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backBtn: { marginBottom: SPACING.md },
    backBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
    headerProfile: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { ...FONTS.title, fontSize: 20 },
    headerSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },

    section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
    sectionTitle: { ...FONTS.sectionTitle, marginBottom: SPACING.sm },

    profileCard: { padding: SPACING.md },
    fieldWrapper: { paddingVertical: SPACING.sm },
    fieldDivider: { height: 1, backgroundColor: COLORS.border },
    fieldLabel: { ...FONTS.caption, marginBottom: 4, letterSpacing: 0.3 },
    fieldInput: {
        ...FONTS.medium,
        fontSize: 15,
        color: COLORS.textPrimary,
        padding: 0,
        minHeight: 24,
    },
    fieldValue: { ...FONTS.medium, fontSize: 15, color: COLORS.textSecondary },

    saveBtn: {
        marginTop: SPACING.sm,
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.md,
        alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.4 },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    optionLabel: { ...FONTS.medium, fontSize: 14 },
    toggleGroup: {
        flexDirection: 'row',
        backgroundColor: COLORS.bgSecondary,
        borderRadius: RADIUS.sm,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    toggleBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    toggleActive: { backgroundColor: COLORS.primary },
    toggleBtnText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
    toggleBtnTextActive: { color: '#fff' },

    stepper: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    stepBtn: {
        width: 32,
        height: 32,
        backgroundColor: COLORS.bgSecondary,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepBtnText: { fontSize: 18, color: COLORS.primary, fontWeight: '700', lineHeight: 22 },
    stepValue: { ...FONTS.bold, fontSize: 16, minWidth: 70, textAlign: 'center' },

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
        backgroundColor: 'rgba(220,38,38,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(220,38,38,0.15)',
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.xxl,
    },
    logoutText: { color: COLORS.error, fontWeight: '600', fontSize: 15 },
});
