/**
 * Login screen — Gemini-inspired purple/lavender with Google OAuth.
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
    Dimensions,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'YOUR_GOOGLE_ANDROID_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'YOUR_GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
    const { login, register, loginWithGoogle } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const fadeAnim = useRef(new Animated.Value(1)).current;
    const usernameRef = useRef(null);
    const emailRef = useRef(null);
    const passwordRef = useRef(null);

    // Google OAuth
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
            console.error('Google Auth Error:', response.error);
            setError('Помилка Google авторизації');
        }
    }, [response]);

    const handleGoogleAuth = async (authentication) => {
        console.log('Google Auth Object:', authentication);
        if (!authentication?.accessToken) {
            setError('Не вдалося отримати токен доступу');
            return;
        }
        setGoogleLoading(true);
        setError('');
        const result = await loginWithGoogle(authentication.accessToken);
        if (!result.success) {
            setError(result.error || 'Помилка Google авторизації');
        }
        setGoogleLoading(false);
    };

    const handleSubmit = async () => {
        if (!username || !password) {
            setError('Заповніть всі поля');
            return;
        }
        if (isRegister && !email) {
            setError('Введіть email');
            return;
        }

        setLoading(true);
        setError('');

        const result = isRegister
            ? await register(username, email, password)
            : await login(username, password);

        if (!result.success) {
            setError(result.error || 'Помилка авторизації');
        }
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

    return (
        <LinearGradient
            colors={['#0f172a', '#1e293b', '#0f172a']}
            style={styles.container}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inner}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        <LinearGradient
                            colors={[COLORS.primaryLight, COLORS.accent]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.logoGradient}
                        >
                            <Icon name="bar-chart" size={48} color={COLORS.white} />
                        </LinearGradient>
                        <Text style={styles.logoText}>Fiscus</Text>
                        <Text style={styles.tagline}>Smart Price · Розумні ціни</Text>
                    </View>

                    {/* Form */}
                    <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
                        {/* Google */}
                        {!GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_WEB_CLIENT_ID') && (
                            <>
                                <TouchableOpacity
                                    style={[styles.googleBtn, googleLoading && styles.submitBtnDisabled]}
                                    onPress={() => promptAsync()}
                                    disabled={!request || googleLoading}
                                >
                                    <View style={styles.googleBtnInner}>
                                        {googleLoading ? (
                                            <ActivityIndicator size="small" color="#4285F4" />
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
                            </>
                        )}

                        {/* Fields */}
                        <View style={styles.inputContainer}>
                            <View style={styles.inputIcon}><Icon name="person-outline" size={20} color={COLORS.textMuted} /></View>
                            <TextInput
                                ref={usernameRef}
                                style={styles.input}
                                placeholder="Ім'я користувача"
                                placeholderTextColor={COLORS.textDark}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                returnKeyType="next"
                                onSubmitEditing={() => isRegister ? emailRef.current?.focus() : passwordRef.current?.focus()}
                            />
                        </View>

                        {isRegister && (
                            <View style={styles.inputContainer}>
                                <View style={styles.inputIcon}><Icon name="mail-outline" size={20} color={COLORS.textMuted} /></View>
                                <TextInput
                                    ref={emailRef}
                                    style={styles.input}
                                    placeholder="Email"
                                    placeholderTextColor={COLORS.textDark}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                />
                            </View>
                        )}

                        <View style={styles.inputContainer}>
                            <View style={styles.inputIcon}><Icon name="lock-closed-outline" size={20} color={COLORS.textMuted} /></View>
                            <TextInput
                                ref={passwordRef}
                                style={styles.input}
                                placeholder="Пароль"
                                placeholderTextColor={COLORS.textDark}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                returnKeyType="done"
                                onSubmitEditing={handleSubmit}
                            />
                        </View>

                        {error ? (
                            <View style={styles.errorContainer}>
                                <Icon name="alert-circle-outline" size={16} color={COLORS.error} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        <TouchableOpacity
                            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={[COLORS.primary, COLORS.primaryDark]}
                                style={styles.submitGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.submitText}>
                                    {loading ? 'Зачекайте...' : isRegister ? 'Зареєструватися' : 'Увійти'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={toggleMode} style={styles.toggleBtn}>
                            <Text style={styles.toggleText}>
                                {isRegister ? 'Вже є акаунт? Увійти' : 'Немає акаунту? Зареєструватися'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.xxl,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    logoGradient: {
        width: 96,
        height: 96,
        borderRadius: RADIUS.xl,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    logoText: {
        fontSize: 36,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 2,
    },
    tagline: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginTop: SPACING.xs,
        letterSpacing: 1,
    },
    formContainer: {
        backgroundColor: 'rgba(12, 10, 29, 0.6)',
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    googleBtn: {
        borderRadius: RADIUS.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    googleBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: SPACING.sm,
    },
    googleIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    googleG: { fontSize: 16, fontWeight: '800', color: '#4285F4' },
    googleBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: SPACING.md,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
    dividerText: { color: COLORS.textMuted, fontSize: 13, marginHorizontal: SPACING.md },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgInput,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    inputIcon: { paddingHorizontal: SPACING.md },
    input: {
        flex: 1,
        height: 52,
        color: COLORS.textPrimary,
        fontSize: 16,
        paddingRight: SPACING.md,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        paddingHorizontal: SPACING.sm,
    },
    errorText: { color: COLORS.error, fontSize: 13, marginLeft: SPACING.xs },
    submitBtn: {
        borderRadius: RADIUS.md,
        overflow: 'hidden',
        marginTop: SPACING.sm,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    submitText: {
        ...FONTS.bold,
        fontSize: 17,
        color: '#fff',
    },
    toggleBtn: {
        marginTop: SPACING.lg,
        alignItems: 'center',
    },
    toggleText: {
        color: COLORS.primarySoft,
        fontSize: 13,
    },
});
