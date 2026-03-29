/**
 * Login screen — Minimalist light-purple design, no gradients/icons.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Animated,
    ActivityIndicator,
    ScrollView,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '834873653875-j72tdq1h10780c4cl3l84f6b09l1h40i.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '834873653875-j72tdq1h10780c4cl3l84f6b09l1h40i.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '834873653875-j72tdq1h10780c4cl3l84f6b09l1h40i.apps.googleusercontent.com';

export default function LoginScreen() {
    const { login, register, loginWithGoogle } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [isBackendUp, setIsBackendUp] = useState(null);

    const fadeAnim = useRef(new Animated.Value(1)).current;
    const usernameRef = useRef(null);
    const emailRef = useRef(null);
    const passwordRef = useRef(null);

    useEffect(() => {
        checkHealth();
    }, []);

    const checkHealth = async () => {
        try {
            await apiClient.healthCheck();
            setIsBackendUp(true);
        } catch (e) {
            setIsBackendUp(false);
        }
    };

    const handleClearData = async () => {
        try {
            await AsyncStorage.clear();
            Alert.alert('Очищено', 'Всі локальні дані видалено. Перезавантажте сторінку (F5).');
            setError('Дані очищено. Перезавантажте сторінку.');
        } catch (e) {
            setError('Не вдалося очистити дані');
        }
    };

    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: GOOGLE_CLIENT_ID,
        androidClientId: GOOGLE_ANDROID_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
    });

    useEffect(() => {
        if (response?.type === 'success') {
            handleGoogleAuth(response.authentication);
        } else if (response?.type === 'error') {
            setError(`Помилка Google: ${response.error?.message || 'невідома помилка'}`);
        } else if (response?.type === 'cancel') {
            setError('Авторизацію скасовано');
        }
    }, [response]);

    const handleGoogleAuth = async (authentication) => {
        if (!authentication?.accessToken) {
            setError('Не вдалося отримати токен доступу');
            return;
        }
        setGoogleLoading(true);
        setError('');
        const result = await loginWithGoogle(authentication.accessToken);
        if (!result.success) setError(result.error || 'Помилка Google авторизації');
        setGoogleLoading(false);
    };

    const handleSubmit = async () => {
        if (!username || !password) { setError('Заповніть всі поля'); return; }
        if (isRegister && !email) { setError('Введіть email'); return; }
        setLoading(true);
        setError('');
        const result = isRegister
            ? await register(username, email, password)
            : await login(username, password);
        if (!result.success) setError(result.error || 'Помилка авторизації');
        setLoading(false);
    };

    const toggleMode = () => {
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: false }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
        ]).start();
        setIsRegister(!isRegister);
        setError('');
    };

    const handleTextChange = (text, setter) => {
        setter(text);
        if (error) setError('');
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        <View style={styles.logoMark}>
                            <Text style={styles.logoMarkText}>F</Text>
                        </View>
                        <Text style={styles.logoText}>Fiscus</Text>
                        <Text style={styles.tagline}>Smart Price · Розумні ціни</Text>

                        {isBackendUp === false && (
                            <View style={styles.healthBanner}>
                                <Text style={styles.healthBannerDot}>●</Text>
                                <Text style={styles.healthText}>Бекенд недоступний. Перевірте з'єднання.</Text>
                            </View>
                        )}
                        {isBackendUp === true && (
                            <View style={styles.healthBannerSuccess}>
                                <Text style={styles.healthBannerDotSuccess}>●</Text>
                                <Text style={styles.healthTextSuccess}>Бекенд онлайн</Text>
                            </View>
                        )}
                    </View>

                    {/* Form */}
                    <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>

                        {/* Google */}
                        <TouchableOpacity
                            style={[styles.googleBtn, googleLoading && styles.btnDisabled]}
                            onPress={() => promptAsync()}
                            disabled={googleLoading}
                        >
                            <View style={styles.googleBtnInner}>
                                {googleLoading ? (
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                ) : (
                                    <View style={styles.googleIconWrap}>
                                        <Text style={styles.googleG}>G</Text>
                                    </View>
                                )}
                                <Text style={styles.googleBtnText}>
                                    {googleLoading ? 'Зачекайте...' : 'Увійти через Google'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>або</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Username */}
                        <View style={styles.fieldWrapper}>
                            <Text style={styles.fieldLabel}>Ім'я користувача</Text>
                            <TextInput
                                ref={usernameRef}
                                style={styles.input}
                                placeholder="username"
                                placeholderTextColor={COLORS.textMuted}
                                value={username}
                                onChangeText={(t) => handleTextChange(t, setUsername)}
                                autoCapitalize="none"
                                returnKeyType="next"
                                onSubmitEditing={() => isRegister ? emailRef.current?.focus() : passwordRef.current?.focus()}
                            />
                        </View>

                        {isRegister && (
                            <View style={styles.fieldWrapper}>
                                <Text style={styles.fieldLabel}>Email</Text>
                                <TextInput
                                    ref={emailRef}
                                    style={styles.input}
                                    placeholder="email@example.com"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={email}
                                    onChangeText={(t) => handleTextChange(t, setEmail)}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                />
                            </View>
                        )}

                        <View style={styles.fieldWrapper}>
                            <Text style={styles.fieldLabel}>Пароль</Text>
                            <TextInput
                                ref={passwordRef}
                                style={styles.input}
                                placeholder="••••••••"
                                placeholderTextColor={COLORS.textMuted}
                                value={password}
                                onChangeText={(t) => handleTextChange(t, setPassword)}
                                secureTextEntry
                                returnKeyType="done"
                                onSubmitEditing={handleSubmit}
                            />
                        </View>

                        {error ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Submit */}
                        <TouchableOpacity
                            style={[styles.submitBtn, loading && styles.btnDisabled]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            <Text style={styles.submitText}>
                                {loading ? 'Зачекайте...' : isRegister ? 'Зареєструватися' : 'Увійти'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={toggleMode} style={styles.toggleBtn}>
                            <Text style={styles.toggleText}>
                                {isRegister ? 'Вже є акаунт? Увійти' : 'Немає акаунту? Зареєструватися'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleClearData} style={styles.resetBtn}>
                            <Text style={styles.resetText}>Скинути всі дані додатка</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgPrimary },
    inner: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.xxl,
    },

    // Logo
    logoContainer: { alignItems: 'center', marginBottom: SPACING.xxl },
    logoMark: {
        width: 80,
        height: 80,
        borderRadius: RADIUS.xl,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    logoMarkText: {
        fontSize: 36,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: -1,
    },
    logoText: {
        fontSize: 34,
        fontWeight: '800',
        color: COLORS.textPrimary,
        letterSpacing: 1,
    },
    tagline: {
        color: COLORS.textSecondary,
        fontSize: 13,
        marginTop: SPACING.xs,
        letterSpacing: 0.5,
    },

    // Health banners
    healthBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.md,
        backgroundColor: 'rgba(220, 38, 38, 0.08)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: RADIUS.full,
        gap: 6,
    },
    healthBannerSuccess: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.md,
        backgroundColor: 'rgba(5, 150, 105, 0.08)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: RADIUS.full,
        gap: 6,
    },
    healthBannerDot: { fontSize: 8, color: COLORS.error },
    healthBannerDotSuccess: { fontSize: 8, color: COLORS.success },
    healthText: { color: COLORS.error, fontSize: 12 },
    healthTextSuccess: { color: COLORS.success, fontSize: 12 },

    // Form
    formContainer: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...{ boxShadow: '0px 4px 24px rgba(124,58,237,0.08)', elevation: 4 },
    },

    // Google button
    googleBtn: {
        borderRadius: RADIUS.md,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
        marginBottom: SPACING.sm,
    },
    googleBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: SPACING.sm,
    },
    googleIconWrap: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#4285F4',
        justifyContent: 'center',
        alignItems: 'center',
    },
    googleG: { fontSize: 14, fontWeight: '800', color: '#fff' },
    googleBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },

    // Divider
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.md },
    dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
    dividerText: { color: COLORS.textMuted, fontSize: 13, marginHorizontal: SPACING.md },

    // Fields
    fieldWrapper: { marginBottom: SPACING.md },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 6,
        letterSpacing: 0.3,
    },
    input: {
        height: 50,
        backgroundColor: COLORS.bgInput,
        borderRadius: RADIUS.md,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.md,
        fontSize: 16,
        color: COLORS.textPrimary,
    },

    // Error
    errorContainer: {
        backgroundColor: 'rgba(220,38,38,0.07)',
        borderRadius: RADIUS.sm,
        padding: SPACING.sm,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: 'rgba(220,38,38,0.15)',
    },
    errorText: { color: COLORS.error, fontSize: 13 },

    // Submit
    submitBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: SPACING.sm,
    },
    btnDisabled: { opacity: 0.6 },
    submitText: { fontSize: 17, fontWeight: '700', color: COLORS.white },

    // Toggle / Reset
    toggleBtn: { marginTop: SPACING.lg, alignItems: 'center' },
    toggleText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
    resetBtn: { marginTop: SPACING.xl, alignItems: 'center', opacity: 0.5 },
    resetText: { color: COLORS.textMuted, fontSize: 12, textDecorationLine: 'underline' },
});
