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
import apiClient from '../api/client';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function callGemini(userMessage, cartItems, totalPrice) {
    const cartInfo = cartItems.length > 0
        ? `Кошик: ${cartItems.length} товарів, ${totalPrice.toFixed(2)} ₴. Товари: ${cartItems.map(i => `${i.name} (${i.price}₴)`).join(', ')}.`
        : 'Кошик порожній.';

    const response = await fetch(`${API_BASE}/ai/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: userMessage,
            context: cartInfo,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data.reply || '🤖 Не вдалося отримати відповідь.';
}


export default function AIAssistantScreen() {
    const { items, totalPrice, totalItems } = useCart();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [thinking, setThinking] = useState(false);
    const scrollRef = useRef(null);

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
            setMessages(prev => [...prev, {
                role: 'ai',
                text: `❌ Помилка: ${e.message}. Перевірте підключення.`,
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
            setMessages(prev => [...prev, { role: 'ai', text: `❌ ${e.message}`, time: new Date() }]);
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
                        <Text style={styles.headerSub}>Google Gemini · Розумний помічник</Text>
                    </View>
                    {GEMINI_API_KEY ? (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Gemini</Text>
                        </View>
                    ) : null}
                </View>
            </LinearGradient>

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
    badge: {
        marginLeft: 'auto',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

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
