import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import GlassCard from '../components/GlassCard';

export default function PaymentScreen({ navigation }) {
    const { upgradeToPro } = useAuth();
    const [card, setCard] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePayment = async () => {
        if (card.length < 16 || !expiry || cvv.length < 3 || !name) {
            Alert.alert('Помилка', 'Будь ласка, заповніть усі поля коректно');
            return;
        }
        setLoading(true);
        try {
            const isPro = await upgradeToPro();
            if (isPro) {
                Alert.alert('Успіх 🎉', 'Дякуємо! Ви успішно перейшли на PRO-версію.', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }
        } catch (e) {
            Alert.alert('Помилка', 'Щось пішло не так при оплаті.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={s.container}>
            {/* PRO banner */}
            <View style={s.header}>
                <View style={s.proBadge}>
                    <Text style={s.proBadgeText}>PRO</Text>
                </View>
                <Text style={s.headerTitle}>Fiscus PRO</Text>
                <Text style={s.headerSub}>Безлімітний AI, глибокий аналіз та преміум підтримка.</Text>

                {/* Features */}
                <View style={s.featuresRow}>
                    {['✦ Безліміт AI', '✦ Аналітика', '✦ Пріоритет'].map((f, i) => (
                        <View key={i} style={s.featureChip}>
                            <Text style={s.featureText}>{f}</Text>
                        </View>
                    ))}
                </View>
                <Text style={s.price}>199 ₴ / місяць</Text>
            </View>

            {/* Form */}
            <GlassCard style={s.formCard}>
                <Text style={s.sectionTitle}>Дані для оплати</Text>

                <View style={s.inputWrapper}>
                    <Text style={s.inputLabel}>Номер картки</Text>
                    <TextInput
                        style={s.input}
                        placeholder="0000 0000 0000 0000"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="numeric"
                        maxLength={19}
                        value={card}
                        onChangeText={setCard}
                    />
                </View>

                <View style={s.row}>
                    <View style={[s.inputWrapper, { flex: 1 }]}>
                        <Text style={s.inputLabel}>Термін (ММ/РР)</Text>
                        <TextInput
                            style={s.input}
                            placeholder="MM/YY"
                            placeholderTextColor={COLORS.textMuted}
                            maxLength={5}
                            value={expiry}
                            onChangeText={setExpiry}
                        />
                    </View>
                    <View style={{ width: SPACING.md }} />
                    <View style={[s.inputWrapper, { flex: 1 }]}>
                        <Text style={s.inputLabel}>CVV</Text>
                        <TextInput
                            style={s.input}
                            placeholder="123"
                            placeholderTextColor={COLORS.textMuted}
                            keyboardType="numeric"
                            secureTextEntry
                            maxLength={3}
                            value={cvv}
                            onChangeText={setCvv}
                        />
                    </View>
                </View>

                <View style={s.inputWrapper}>
                    <Text style={s.inputLabel}>Ім'я на картці</Text>
                    <TextInput
                        style={s.input}
                        placeholder="IVAN FRANKO"
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="characters"
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <TouchableOpacity
                    style={[s.payBtn, loading && { opacity: 0.7 }]}
                    onPress={handlePayment}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={s.payBtnText}>Оплатити PRO</Text>
                    }
                </TouchableOpacity>

                <Text style={s.secureText}>🔒 Безпечний платіж</Text>
            </GlassCard>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgPrimary },

    header: {
        backgroundColor: COLORS.white,
        padding: SPACING.lg,
        paddingTop: SPACING.xl,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    proBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.md,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
        marginBottom: SPACING.sm,
    },
    proBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 2 },
    headerTitle: { ...FONTS.title, fontSize: 26, marginBottom: 4 },
    headerSub: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: SPACING.md },

    featuresRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
    featureChip: {
        backgroundColor: COLORS.primarySoft,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
    },
    featureText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
    price: { fontSize: 22, fontWeight: '800', color: COLORS.primary },

    formCard: { margin: SPACING.lg },
    sectionTitle: { ...FONTS.bold, fontSize: 17, marginBottom: SPACING.md },
    inputWrapper: { marginBottom: SPACING.md },
    inputLabel: { ...FONTS.caption, marginBottom: 6, fontWeight: '600', letterSpacing: 0.3 },
    input: {
        backgroundColor: COLORS.bgInput,
        borderRadius: RADIUS.md,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.md,
        height: 48,
        color: COLORS.textPrimary,
        fontSize: 16,
    },
    row: { flexDirection: 'row' },
    payBtn: {
        backgroundColor: COLORS.primary,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        marginTop: SPACING.sm,
        ...SHADOWS.button,
    },
    payBtnText: { ...FONTS.bold, color: '#fff', fontSize: 16 },
    secureText: { ...FONTS.caption, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.md },
});
