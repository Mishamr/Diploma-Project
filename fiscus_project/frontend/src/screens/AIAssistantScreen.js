/**
 * AI Assistant screen — powered by real Google Gemini API.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

async function callGemini(userMessage, cartItems, totalPrice) {
    const cartInfo = cartItems.length > 0
        ? `Кошик: ${cartItems.length} товарів, ${totalPrice.toFixed(2)} ₴. Товари: ${cartItems.map(i => `${i.name} (${i.price}₴)`).join(', ')}.`
        : 'Кошик порожній.';

    try {
        const data = await apiClient.post('/ai/chat/', {
            message: userMessage,
            context: cartInfo,
        });
        return data.reply || '🤖 Не вдалося отримати відповідь.';
    } catch (error) {
        if (error.response && error.response.status === 429) {
            return "⏳ ШІ зараз перевантажений запитами (ліміт Google Gemini). Будь ласка, зробіть паузу на 30-40 секунд і спробуйте написати ще раз. Це допоможе уникнути блокування.";
        }
        throw error;
    }
}


export default function AIAssistantScreen() {
    const { items, totalPrice, totalItems } = useCart();
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [thinking, setThinking] = useState(false);
    const scrollRef = useRef(null);
    const [profile, setProfile] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [tempProfile, setTempProfile] = useState({});

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const data = await apiClient.get('/auth/profile/');
            setProfile(data);
            setTempProfile(data);
        } catch (e) {
            console.error("Fetch profile error:", e);
        }
    };

    const saveProfile = async () => {
        try {
            await apiClient.put('/auth/profile/', tempProfile);
            setProfile(tempProfile);
            setShowSettings(false);
        } catch (e) {
            console.error("Save profile error:", e);
        }
    };

    useEffect(() => {
        const greeting = totalItems > 0
            ? `Привіт! 👋 У вашому кошику ${totalItems} товарів на **${totalPrice.toFixed(2)} ₴**. Запитайте про ціни, знижки або оптимізацію!`
            : 'Привіт! 👋 Я AI-помічник Fiscus на базі Google Gemini. Можу допомогти з аналізом цін, знижками та порадами для покупок в АТБ. Запитайте що завгодно!';
        setMessages([{ role: 'ai', text: greeting, time: new Date() }]);
    }, []);

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || thinking) return;

        setMessages(prev => [...prev, { role: 'user', text, time: new Date() }]);
        setInput('');
        setThinking(true);

        try {
            const aiText = await callGemini(text, items, totalPrice);
            setMessages(prev => [...prev, { role: 'ai', text: aiText, time: new Date() }]);
        } catch (e) {
            console.error("Gemini Chat Error:", e);
            setMessages(prev => [...prev, {
                role: 'ai',
                text: `❌ Помилка: ${e.message}. Можливо, ШІ тимчасово недоступний.`,
                time: new Date(),
            }]);
        }
        setThinking(false);
    }, [input, thinking, items, totalPrice]);

    const quickActions = [
        { label: '🏷 Акції', query: 'Які зараз найкращі знижки в АТБ?' },
        { label: '📊 Мій кошик', query: 'Проаналізуй мій поточний кошик і порадь як заощадити' },
        { label: '💡 Поради', query: 'Дай 5 порад як економити в супермаркеті' },
        { label: '🥦 Здорово', query: 'Склади здоровий кошик на тиждень до 500 ₴' },
        { label: '🔍 Пошук', query: 'Де найдешевше молоко в АТБ?' },
    ];

    const handleQuickAction = useCallback(async (query) => {
        if (thinking) return;
        setMessages(prev => [...prev, { role: 'user', text: query, time: new Date() }]);
        setThinking(true);
        try {
            const aiText = await callGemini(query, items, totalPrice);
            setMessages(prev => [...prev, { role: 'ai', text: aiText, time: new Date() }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', text: `❌ Помилка: ${e.message}`, time: new Date() }]);
        }
        setThinking(false);
    }, [thinking, items, totalPrice]);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Header */}
            <LinearGradient
                colors={COLORS.gradientAI}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.headerInner}>
                    <View style={styles.aiAvatar}>
                        <Icon name="sparkles" size={22} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Fiscus AI</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                            <Text style={styles.headerSub}>Google Gemini · Розумний помічник</Text>
                            {user?.is_pro && (
                                <View style={styles.proBadge}>
                                    <Icon name="star" size={10} color={COLORS.accent} />
                                    <Text style={styles.proText}>PRO</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <TouchableOpacity 
                        style={styles.settingsBtn} 
                        onPress={() => setShowSettings(!showSettings)}
                    >
                        <Icon name={showSettings ? "close" : "options-outline"} size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {showSettings && (
                <View style={styles.settingsPanel}>
                    <Text style={styles.settingsTitle}>Налаштування ШІ ⚙️</Text>
                    <TextInput
                        style={styles.settingsInput}
                        placeholder="Як до вас звертатися?"
                        value={tempProfile.ai_custom_name}
                        onChangeText={t => setTempProfile({...tempProfile, ai_custom_name: t})}
                    />
                    <TextInput
                        style={styles.settingsInput}
                        placeholder="Алергії (лактоза, горіхи...)"
                        value={tempProfile.ai_allergies}
                        onChangeText={t => setTempProfile({...tempProfile, ai_allergies: t})}
                    />
                    <TextInput
                        style={[styles.settingsInput, { height: 60 }]}
                        placeholder="Додаткові побажання до бота"
                        multiline
                        value={tempProfile.ai_instructions}
                        onChangeText={t => setTempProfile({...tempProfile, ai_instructions: t})}
                    />
                    <TouchableOpacity style={styles.saveSettingsBtn} onPress={saveProfile}>
                        <Text style={styles.saveSettingsText}>Зберегти налаштування</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Messages */}
            <ScrollView
                ref={scrollRef}
                style={styles.messages}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                keyboardShouldPersistTaps="handled"
            >
                {messages.map((msg, idx) => (
                    <View key={idx} style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
                        {msg.role === 'ai' && (
                            <View style={styles.msgAvatar}>
                                <Icon name="sparkles" size={10} color={COLORS.primary} />
                            </View>
                        )}
                        <View style={[styles.msgBubble, msg.role === 'user' ? styles.msgUser : styles.msgAI]}>
                            <Text style={[styles.msgText, msg.role === 'user' && styles.msgTextUser]}>
                                {msg.text}
                            </Text>
                            {msg.product && (
                                <View style={styles.suggestionProduct}>
                                    <Image source={{ uri: msg.product.image_url }} style={styles.suggestionImage} />
                                    <View>
                                        <Text style={styles.suggestionName}>{msg.product.name}</Text>
                                        <Text style={styles.suggestionPrice}>{msg.product.price} ₴</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                ))}

                {thinking && (
                    <View style={styles.msgRow}>
                        <View style={styles.msgAvatar}>
                            <Icon name="sparkles" size={10} color={COLORS.primary} />
                        </View>
                        <View style={[styles.msgBubble, styles.msgAI]}>
                            <View style={styles.typingDots}>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                                <Text style={[styles.msgText, { marginLeft: 8 }]}>Аналізую...</Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Quick actions */}
            {messages.length <= 1 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.quickActions}
                    contentContainerStyle={{ paddingHorizontal: SPACING.md }}
                >
                    {quickActions.map((qa, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.quickBtn}
                            onPress={() => handleQuickAction(qa.query)}
                        >
                            <Text style={styles.quickBtnText}>{qa.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            {/* Input */}
            <View style={styles.inputBar}>
                <TextInput
                    style={styles.input}
                    placeholder="Запитайте Gemini про ціни, акції..."
                    placeholderTextColor={COLORS.textDark}
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={sendMessage}
                    returnKeyType="send"
                    multiline={false}
                />
                <TouchableOpacity
                    style={[styles.sendBtn, (!input.trim() || thinking) && { opacity: 0.4 }]}
                    onPress={sendMessage}
                    disabled={!input.trim() || thinking}
                >
                    <Icon name="send" size={18} color="#fff" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgPrimary },
    header: {
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderBottomLeftRadius: RADIUS.xl,
        borderBottomRightRadius: RADIUS.xl,
    },
    headerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    aiAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { ...FONTS.subtitle, color: '#fff' },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
    proBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, gap: 2, borderWidth: 1, borderColor: COLORS.accent },
    proText: { ...FONTS.bold, color: COLORS.accent, fontSize: 9 },
    badge: {
        marginLeft: 'auto',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    settingsBtn: { marginLeft: 'auto', padding: 8 },
    settingsPanel: {
        backgroundColor: COLORS.bgCard,
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        ...SHADOWS.card,
    },
    settingsTitle: { ...FONTS.medium, fontSize: 14, marginBottom: SPACING.sm },
    settingsInput: {
        backgroundColor: COLORS.bgInput,
        borderRadius: RADIUS.sm,
        padding: SPACING.sm,
        marginBottom: SPACING.xs,
        fontSize: 13,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    saveSettingsBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.full,
        padding: SPACING.sm,
        alignItems: 'center',
        marginTop: SPACING.xs,
    },
    saveSettingsText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    messages: { flex: 1 },
    messagesContent: { padding: SPACING.md, paddingBottom: SPACING.sm },
    msgRow: { flexDirection: 'row', marginBottom: SPACING.sm, alignItems: 'flex-end' },
    msgRowUser: { justifyContent: 'flex-end' },
    msgAvatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: COLORS.glass,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.xs,
    },
    msgBubble: { maxWidth: '82%', borderRadius: RADIUS.md, padding: SPACING.sm },
    msgAI: {
        backgroundColor: COLORS.glass,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        borderBottomLeftRadius: 4,
    },
    msgUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
    msgText: { ...FONTS.regular, fontSize: 13, lineHeight: 19 },
    msgTextUser: { color: '#fff' },
    typingDots: { flexDirection: 'row', alignItems: 'center' },

    quickActions: { maxHeight: 44, marginBottom: SPACING.xs },
    quickBtn: {
        backgroundColor: COLORS.glass,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        marginRight: SPACING.xs,
    },
    quickBtnText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },

    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.glassBorder,
        backgroundColor: COLORS.bgSecondary,
        paddingBottom: Platform.OS === 'ios' ? SPACING.lg : SPACING.sm,
    },
    input: {
        flex: 1,
        height: 40,
        backgroundColor: COLORS.bgInput,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.md,
        color: COLORS.textPrimary,
        fontSize: 14,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: SPACING.xs,
        ...SHADOWS.button,
    },
});
