import React, { useState, useContext, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Keyboard,
    TouchableWithoutFeedback,
    Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const colors = {
    background: '#1a1a2e',
    primary: '#4ecca3',
    secondary: '#e94560',
    card: 'rgba(255, 255, 255, 0.1)',
    text: '#ffffff',
    textMuted: '#a0a0a0',
};

export default function RegisterScreen({ navigation }) {
    const { register, isLoading } = useContext(AuthContext);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [focusedInput, setFocusedInput] = useState(null);

    // Animations using standard RN Animated
    const formOpacity = useRef(new Animated.Value(0)).current;
    const formTranslate = useRef(new Animated.Value(50)).current;
    const logoScale = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 6,
                useNativeDriver: true,
            }),
            Animated.sequence([
                Animated.delay(300),
                Animated.parallel([
                    Animated.timing(formOpacity, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.spring(formTranslate, {
                        toValue: 0,
                        friction: 8,
                        useNativeDriver: true,
                    }),
                ]),
            ]),
        ]).start();
    }, []);

    const handleRegister = async () => {
        Keyboard.dismiss();
        if (!username || !email || !password) return;

        const success = await register({ username, email, password });
        if (success) {
            // Navigation handled by auth state change
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <LinearGradient colors={['#1a0a2e', '#16213e', '#0f3460', '#1a0a2e']} style={styles.container}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
                        <LinearGradient
                            colors={[colors.primary, '#2d6a4f']}
                            style={styles.logoBackground}
                        >
                            <Ionicons name="person-add" size={40} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.appName}>Приєднуйся</Text>
                        <Text style={styles.tagline}>Створи свій акаунт Fiscus</Text>
                    </Animated.View>

                    <Animated.View style={[
                        styles.formContainer,
                        { opacity: formOpacity, transform: [{ translateY: formTranslate }] }
                    ]}>
                        {/* Username Input */}
                        <View style={[styles.inputContainer, focusedInput === 'username' && styles.inputFocused]}>
                            <Ionicons name="person-outline" size={20} color={focusedInput === 'username' ? colors.primary : colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="Ім'я користувача"
                                placeholderTextColor={colors.textMuted}
                                value={username}
                                onChangeText={setUsername}
                                onFocus={() => setFocusedInput('username')}
                                onBlur={() => setFocusedInput(null)}
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Email Input */}
                        <View style={[styles.inputContainer, focusedInput === 'email' && styles.inputFocused]}>
                            <Ionicons name="mail-outline" size={20} color={focusedInput === 'email' ? colors.primary : colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                placeholderTextColor={colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                onFocus={() => setFocusedInput('email')}
                                onBlur={() => setFocusedInput(null)}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        {/* Password Input */}
                        <View style={[styles.inputContainer, focusedInput === 'password' && styles.inputFocused]}>
                            <Ionicons name="lock-closed-outline" size={20} color={focusedInput === 'password' ? colors.primary : colors.textMuted} />
                            <TextInput
                                style={styles.input}
                                placeholder="Пароль"
                                placeholderTextColor={colors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                onFocus={() => setFocusedInput('password')}
                                onBlur={() => setFocusedInput(null)}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleRegister}
                            disabled={isLoading || !username || !email || !password}
                            style={[styles.loginButton, (!username || !email || !password) && styles.loginButtonDisabled]}
                        >
                            <LinearGradient
                                colors={['#4ecca3', '#2d6a4f']}
                                style={styles.gradientButton}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.loginButtonText}>
                                    {isLoading ? 'Реєстрація...' : 'Створити акаунт'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.dividerContainer}>
                            <View style={styles.divider} />
                            <Text style={styles.dividerText}>АБО</Text>
                            <View style={styles.divider} />
                        </View>

                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.registerLink}>
                            <Text style={styles.registerText}>
                                Вже маєте акаунт? <Text style={styles.registerHighlight}>Увійти</Text>
                            </Text>
                        </TouchableOpacity>
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
        padding: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoBackground: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        elevation: 10,
        shadowColor: '#4ecca3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.text,
        letterSpacing: 1,
    },
    tagline: {
        fontSize: 16,
        color: colors.textMuted,
        marginTop: 5,
    },
    formContainer: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 12,
        marginBottom: 15,
        paddingHorizontal: 15,
        height: 55,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    inputFocused: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(78, 204, 163, 0.1)',
    },
    input: {
        flex: 1,
        color: colors.text,
        marginLeft: 10,
        fontSize: 16,
    },
    loginButton: {
        borderRadius: 12,
        marginTop: 10,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#4ecca3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    gradientButton: {
        paddingVertical: 15,
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    dividerText: {
        color: colors.textMuted,
        paddingHorizontal: 10,
        fontSize: 12,
    },
    registerLink: {
        alignItems: 'center',
    },
    registerText: {
        color: colors.textMuted,
        fontSize: 14,
    },
    registerHighlight: {
        color: colors.primary,
        fontWeight: 'bold',
    },
});
