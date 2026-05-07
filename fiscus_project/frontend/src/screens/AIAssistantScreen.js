/**
 * AI Assistant screen — фінансовий помічник Fiscus.
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
    Image,
} from 'react-native';

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
        return data.reply || 'Не вдалося отримати відповідь.';
    } catch (error) {
        if (error.response && error.response.status === 429) {
            return "ШІ зараз перевантажений запитами (ліміт Google Gemini). Будь ласка, зробіть паузу на 30-40 секунд і спробуйте написати ще раз. Це допоможе уникнути блокування.";
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
            await apiClient.updateProfile(tempProfile);
            setProfile(tempProfile);
            setShowSettings(false);
        } catch (e) {
            console.error("Save profile error:", e);
        }
    };

    useEffect(() => {
        const greeting = totalItems > 0
            ? `Доброго дня! У вашому кошику ${totalItems} товарів на ${totalPrice.toFixed(2)} ₴. Запитайте про ціни, знижки або як оптимізувати список покупок.`
            : 'Доброго дня! Я помічник Fiscus. Можу допомогти з аналізом цін, пошуком знижок та порадами для економних покупок. Запитайте що вас цікавить.';
        setMessages([{ role: 'ai', text: greeting, time: new Date() }]);
    }, []);

    const isDietaryQuery = (txt) => {
        const lower = txt.toLowerCase();
        return lower.includes('здоров') || lower.includes('дієт') || lower.includes('меню') || lower.includes('алерг');
    };

    const needsProfileInfo = () => {
        return !profile?.ai_allergies && !profile?.ai_instructions;
    };

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || thinking) return;

        if (isDietaryQuery(text) && needsProfileInfo()) {
            setMessages(prev => [...prev, { role: 'user', text, time: new Date() }]);
            setMessages(prev => [...prev, { 
                role: 'ai', 
                text: 'Щоб підібрати відповідні продукти, заповніть, будь ласка, інформацію про алергії та харчові обмеження у налаштуваннях (форма відкрита вище).', 
                time: new Date() 
            }]);
            setShowSettings(true);
            setInput('');
            return;
        }

        setMessages(prev => [...prev, { role: 'user', text, time: new Date() }]);
        setInput('');
        setThinking(true);

        try {
            const aiText = await callGemini(text, items, totalPrice);
            setMessages(prev => [...prev, { role: 'ai', text: aiText, time: new Date() }]);
        } catch (e) {
            console.error("Chat Error:", e);
            setMessages(prev => [...prev, {
                role: 'ai',
                text: `Виникла помилка: ${e.message}. Спробуйте повторити запит через кілька секунд.`,
                time: new Date(),
            }]);
        }
        setThinking(false);
    }, [input, thinking, items, totalPrice]);

    const quickActions = [
        { label: 'Акції', query: 'Які зараз найкращі знижки в АТБ?' },
        { label: 'Мій кошик', query: 'Проаналізуй мій поточний кошик і порадь як заощадити' },
        { label: 'Поради', query: 'Дай 5 порад як економити в супермаркеті' },
        { label: 'Здорово', query: 'Склади здоровий кошик на тиждень до 500 ₴' },
        { label: 'Пошук', query: 'Де найдешевше молоко в АТБ?' },
    ];

    const handleQuickAction = useCallback(async (query) => {
        if (thinking) return;
        
        if (isDietaryQuery(query) && needsProfileInfo()) {
            setMessages(prev => [...prev, { role: 'user', text: query, time: new Date() }]);
            setMessages(prev => [...prev, { 
                role: 'ai', 
                text: 'Щоб підібрати відповідні продукти, заповніть інформацію про алергії та харчові обмеження у налаштуваннях (форма відкрита вище).', 
                time: new Date() 
            }]);
            setShowSettings(true);
            return;
        }

        setMessages(prev => [...prev, { role: 'user', text: query, time: new Date() }]);
        setThinking(true);
        try {
            const aiText = await callGemini(query, items, totalPrice);
            setMessages(prev => [...prev, { role: 'ai', text: aiText, time: new Date() }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', text: `Помилка: ${e.message}. Спробуйте ще раз.`, time: new Date() }]);
        }
        setThinking(false);
    }, [thinking, items, totalPrice]);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerInner}>
                    <View style={styles.aiAvatar}>
                        <Text style={styles.aiAvatarText}>F</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Помічник Fiscus</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                            <Text style={styles.headerSub}>Фінансовий консультант</Text>
                            {user?.is_pro && (
                                <View style={styles.proBadge}>
                                    <Text style={styles.proText}>PRO</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <TouchableOpacity 
                        style={styles.settingsBtn} 
                        onPress={() => setShowSettings(!showSettings)}
                    >
                        <Text style={styles.settingsBtnText}>{showSettings ? 'Закрити' : 'Налашт.'}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {showSettings && (
                <View style={styles.settingsPanel}>
                    <Text style={styles.settingsTitle}>Налаштування ШІ-помічника</Text>
                    
                    <View style={styles.settingsField}>
                        <Text style={styles.settingsLabel}>Ваше ім'я</Text>
                        <TextInput
                            style={styles.settingsInput}
                            placeholder="Наприклад: Олексій"
                            placeholderTextColor={COLORS.textMuted}
                            value={tempProfile.ai_custom_name}
                            onChangeText={t => setTempProfile({...tempProfile, ai_custom_name: t})}
                        />
                    </View>

                    <View style={styles.settingsField}>
                        <Text style={styles.settingsLabel}>Алергії та непереносимості</Text>
                        <TextInput
                            style={styles.settingsInput}
                            placeholder="Наприклад: лактоза, горіхи, глютен"
                            placeholderTextColor={COLORS.textMuted}
                            value={tempProfile.ai_allergies}
                            onChangeText={t => setTempProfile({...tempProfile, ai_allergies: t})}
                        />
                    </View>

                    <View style={styles.settingsField}>
                        <Text style={styles.settingsLabel}>Дієтичні обмеження / побажання</Text>
                        <TextInput
                            style={[styles.settingsInput, styles.settingsInputMultiline]}
                            placeholder="Наприклад: не їм м'ясо, веган, кето-дієта"
                            placeholderTextColor={COLORS.textMuted}
                            multiline
                            value={tempProfile.ai_instructions}
                            onChangeText={t => setTempProfile({...tempProfile, ai_instructions: t})}
                        />
                    </View>

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
                                <Text style={styles.msgAvatarText}>F</Text>
                            </View>
                        )}
                        <View style={[styles.msgBubble, msg.role === 'user' ? styles.msgUser : styles.msgAI]}>
                            <Text style={[styles.msgText, msg.role === 'user' && styles.msgTextUser]}>
                                {msg.text}
                            </Text>
                            {msg.product && (
                                <View style={styles.suggestionProduct}>
                                    {msg.product.image_url ? (
                                        <Image source={{ uri: msg.product.image_url }} style={styles.suggestionImage} resizeMode="cover" />
                                    ) : (
                                        <View style={[styles.suggestionImage, { backgroundColor: '#F0EDF6', justifyContent: 'center', alignItems: 'center' }]}>
                                            <Text style={{ fontSize: 10, color: '#9B95AE' }}>фото</Text>
                                        </View>
                                    )}
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
                            <Text style={styles.msgAvatarText}>F</Text>
                        </View>
                        <View style={[styles.msgBubble, styles.msgAI]}>
                            <View style={styles.typingDots}>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                                <Text style={[styles.msgText, { marginLeft: 8 }]}>Опрацьовую запит...</Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Quick actions */}
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
                    <Text style={styles.sendBtnText}>↑</Text>
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
        backgroundColor: COLORS.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerInner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    aiAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center',
    },
    aiAvatarText: { fontSize: 16, color: '#fff', fontWeight: '800', letterSpacing: -1 },
    headerTitle: { ...FONTS.subtitle, color: COLORS.textPrimary },
    headerSub: { color: COLORS.textMuted, fontSize: 11 },
    proBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm },
    proText: { color: '#fff', fontSize: 9, fontWeight: '800' },
    settingsBtn: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm, backgroundColor: COLORS.bgSecondary, borderWidth: 1, borderColor: COLORS.border },
    settingsBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
    settingsPanel: {
        backgroundColor: COLORS.bgCard,
        padding: SPACING.md,
        paddingTop: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        ...SHADOWS.card,
    },
    settingsTitle: { ...FONTS.bold, fontSize: 15, marginBottom: SPACING.md, color: COLORS.textPrimary },
    settingsField: {
        marginBottom: SPACING.sm,
    },
    settingsLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 4,
        letterSpacing: 0.2,
    },
    settingsInput: {
        backgroundColor: COLORS.bgInput,
        borderRadius: RADIUS.sm,
        padding: SPACING.sm,
        paddingHorizontal: SPACING.md,
        fontSize: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        color: COLORS.textPrimary,
    },
    settingsInputMultiline: {
        height: 64,
        textAlignVertical: 'top',
    },
    saveSettingsBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        paddingVertical: SPACING.md - 2,
        alignItems: 'center',
        marginTop: SPACING.sm,
    },
    saveSettingsText: { color: '#fff', fontSize: 13, fontWeight: '700' },

    messages: { flex: 1 },
    messagesContent: { padding: SPACING.md, paddingBottom: SPACING.sm },
    msgRow: { flexDirection: 'row', marginBottom: SPACING.sm, alignItems: 'flex-end' },
    msgRowUser: { justifyContent: 'flex-end' },
    msgAvatar: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: COLORS.primarySoft,
        borderWidth: 1, borderColor: COLORS.border,
        justifyContent: 'center', alignItems: 'center',
        marginRight: SPACING.xs,
    },
    msgAvatarText: { fontSize: 9, color: COLORS.primary, fontWeight: '700' },
    msgBubble: { maxWidth: '82%', borderRadius: RADIUS.md, padding: SPACING.sm },
    msgAI: {
        backgroundColor: COLORS.bgCard,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderBottomLeftRadius: 4,
    },
    msgUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
    msgText: { ...FONTS.regular, fontSize: 13, lineHeight: 19 },
    msgTextUser: { color: '#fff' },
    typingDots: { flexDirection: 'row', alignItems: 'center' },

    quickActions: { maxHeight: 44, marginBottom: SPACING.xs },
    quickBtn: {
        backgroundColor: COLORS.bgCard,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        marginRight: SPACING.xs,
    },
    quickBtnText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },

    inputBar: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
        borderTopWidth: 1, borderTopColor: COLORS.border,
        backgroundColor: COLORS.bgCard,
        paddingBottom: Platform.OS === 'ios' ? SPACING.lg : SPACING.sm,
    },
    input: {
        flex: 1, height: 40,
        backgroundColor: COLORS.bgInput,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.md,
        color: COLORS.textPrimary,
        fontSize: 14,
        borderWidth: 1, borderColor: COLORS.border,
    },
    sendBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center',
        marginLeft: SPACING.xs,
        ...SHADOWS.button,
    },
    sendBtnText: { fontSize: 20, color: '#fff', fontWeight: '700', lineHeight: 24 },
});
