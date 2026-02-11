/**
 * @fileoverview Login Screen - Premium Design.
 * 
 * Beautiful authentication screen with gradient background,
 * glassmorphism effects, and animated elements.
 * 
 * @module screens/LoginScreen
 */

import React, { useState, useContext, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    Animated,
    Dimensions,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Context & Theme
import { AuthContext } from '../context/AuthContext';
import { theme, colors, spacing } from '../theme';

const { width, height } = Dimensions.get('window');

/**
 * Floating animated circle background element
 */
const FloatingCircle = ({ delay, size, position }) => {
    const animation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = () => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(animation, {
                        toValue: 1,
                        duration: 3000 + delay,
                        useNativeDriver: true,
                    }),
                    Animated.timing(animation, {
                        toValue: 0,
                        duration: 3000 + delay,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };
        setTimeout(animate, delay);
    }, []);

    const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 20],
    });

    return (
        <Animated.View
            style={[
                styles.floatingCircle,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    ...position,
                    transform: [{ translateY }],
                },
            ]}
        />
    );
};

/**
 * Login Screen Component.
 */
export default function LoginScreen({ navigation }) {
    const { login, isLoading } = useContext(AuthContext);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [focusedInput, setFocusedInput] = useState(null);

    // Animations
    const logoScale = useRef(new Animated.Value(0)).current;
    const formOpacity = useRef(new Animated.Value(0)).current;
    const formTranslate = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        // Entry animations
        Animated.sequence([
            Animated.spring(logoScale, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.parallel([
                Animated.timing(formOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(formTranslate, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, []);

    const handleLogin = async () => {
        Keyboard.dismiss();
        const success = await login(username, password);
        if (success) {
            if (navigation.canGoBack()) {
                navigation.goBack();
            } else {
                navigation.navigate('Home');
            }
        }
    };

    /**
     * Handle social login button press.
     * Shows OAuth coming soon message or demo login.
     * @param {string} provider - OAuth provider name (Google, Apple, Facebook)
     */
    const handleSocialLogin = (provider) => {
        Alert.alert(
            `${provider} авторизація`,
            `Вхід через ${provider} буде доступний найближчим часом.\n\nДля демо використовуйте:\nЛогін: admin\nПароль: admin`,
            [
                { text: 'OK', style: 'default' },
                {
                    text: 'Демо вхід',
                    onPress: async () => {
                        setUsername('admin');
                        setPassword('admin');
                        const success = await login('admin', 'admin');
                        if (success) {
                            navigation.navigate('Home');
                        }
                    }
                },
            ]
        );
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <LinearGradient
                colors={['#1a0a2e', '#16213e', '#0f3460', '#1a0a2e']}
                locations={[0, 0.3, 0.6, 1]}
                style={styles.container}
            >
                {/* Animated Background Elements */}
                <FloatingCircle
                    delay={0}
                    size={200}
                    position={{ top: -50, right: -50 }}
                />
                <FloatingCircle
                    delay={500}
                    size={150}
                    position={{ top: height * 0.3, left: -75 }}
                />
                <FloatingCircle
                    delay={1000}
                    size={100}
                    position={{ bottom: 100, right: 30 }}
                />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    {/* Logo Section */}
                    <Animated.View
                        style={[
                            styles.logoContainer,
                            { transform: [{ scale: logoScale }] }
                        ]}
                    >
                        <LinearGradient
                            colors={['#9D4EDD', '#7B2CBF', '#5A189A']}
                            style={styles.logoGradient}
                        >
                            <Ionicons name="wallet" size={48} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.logoText}>FISCUS</Text>
                        <Text style={styles.tagline}>Розумний помічник покупок</Text>
                    </Animated.View>

                    {/* Login Form */}
                    <Animated.View
                        style={[
                            styles.formContainer,
                            {
                                opacity: formOpacity,
                                transform: [{ translateY: formTranslate }],
                            }
                        ]}
                    >
                        <View style={styles.glassCard}>
                            {/* Username Input */}
                            <View style={[
                                styles.inputContainer,
                                focusedInput === 'username' && styles.inputFocused
                            ]}>
                                <Ionicons
                                    name="person-outline"
                                    size={20}
                                    color={focusedInput === 'username' ? colors.primary : colors.textMuted}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ім'я користувача"
                                    placeholderTextColor={colors.textMuted}
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    onFocus={() => setFocusedInput('username')}
                                    onBlur={() => setFocusedInput(null)}
                                />
                            </View>

                            {/* Password Input */}
                            <View style={[
                                styles.inputContainer,
                                focusedInput === 'password' && styles.inputFocused
                            ]}>
                                <Ionicons
                                    name="lock-closed-outline"
                                    size={20}
                                    color={focusedInput === 'password' ? colors.primary : colors.textMuted}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Пароль"
                                    placeholderTextColor={colors.textMuted}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    onFocus={() => setFocusedInput('password')}
                                    onBlur={() => setFocusedInput(null)}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons
                                        name={showPassword ? "eye-outline" : "eye-off-outline"}
                                        size={20}
                                        color={colors.textMuted}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Forgot Password */}
                            <TouchableOpacity style={styles.forgotButton}>
                                <Text style={styles.forgotText}>Забули пароль?</Text>
                            </TouchableOpacity>

                            {/* Login Button */}
                            <TouchableOpacity
                                style={styles.loginButton}
                                onPress={handleLogin}
                                disabled={isLoading || !username || !password}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#9D4EDD', '#7B2CBF']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.buttonGradient}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Text style={styles.buttonText}>Увійти</Text>
                                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Divider */}
                            <View style={styles.divider}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>або</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            {/* Social Buttons */}
                            <View style={styles.socialButtons}>
                                <TouchableOpacity
                                    style={styles.socialButton}
                                    onPress={() => handleSocialLogin('Google')}
                                >
                                    <Ionicons name="logo-google" size={24} color="#EA4335" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.socialButton}
                                    onPress={() => handleSocialLogin('Apple')}
                                >
                                    <Ionicons name="logo-apple" size={24} color="#fff" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.socialButton}
                                    onPress={() => handleSocialLogin('Facebook')}
                                >
                                    <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Demo Hint */}
                        <View style={styles.hintContainer}>
                            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
                            <Text style={styles.hintText}>
                                Демо: admin / admin
                            </Text>
                        </View>

                        {/* Register Link */}
                        <View style={styles.registerContainer}>
                            <Text style={styles.registerText}>Немає акаунту? </Text>
                            <TouchableOpacity onPress={() => Alert.alert(
                                'Реєстрація',
                                'Функція реєстрації буде доступна найближчим часом.\n\nДля тестування використовуйте:\nЛогін: admin\nПароль: admin',
                                [{ text: 'OK' }]
                            )}>
                                <Text style={styles.registerLink}>Зареєструватися</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </KeyboardAvoidingView>
            </LinearGradient>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.l,
    },
    floatingCircle: {
        position: 'absolute',
        backgroundColor: 'rgba(157, 78, 221, 0.15)',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    logoGradient: {
        width: 100,
        height: 100,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.m,
        shadowColor: '#9D4EDD',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 15,
    },
    logoText: {
        fontSize: 36,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 4,
    },
    tagline: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: spacing.xs,
    },
    formContainer: {
        width: '100%',
    },
    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 24,
        padding: spacing.l,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 12,
        paddingHorizontal: spacing.m,
        marginBottom: spacing.m,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    inputFocused: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(157, 78, 221, 0.1)',
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        paddingVertical: spacing.m,
        marginLeft: spacing.s,
    },
    forgotButton: {
        alignSelf: 'flex-end',
        marginBottom: spacing.l,
    },
    forgotText: {
        color: colors.primary,
        fontSize: 13,
    },
    loginButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: spacing.l,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.m + 2,
        gap: spacing.s,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.l,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    dividerText: {
        color: 'rgba(255, 255, 255, 0.5)',
        paddingHorizontal: spacing.m,
        fontSize: 12,
    },
    socialButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.m,
    },
    socialButton: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    hintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.l,
        gap: spacing.xs,
    },
    hintText: {
        color: colors.textMuted,
        fontSize: 12,
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.m,
    },
    registerText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
    },
    registerLink: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
});
