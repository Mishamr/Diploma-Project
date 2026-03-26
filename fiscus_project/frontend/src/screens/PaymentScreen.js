import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

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
                Alert.alert('Успіх', 'Дякуємо! Ви успішно перейшли на PRO-версію.', [
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
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={s.header}>
                <Icon name="star" size={40} color={COLORS.accent} />
                <Text style={s.headerTitle}>Fiscus PRO</Text>
                <Text style={s.headerSub}>Безлімітний AI, глибокий аналіз та преміум підтримка.</Text>
            </LinearGradient>

            <View style={s.formContainer}>
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
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={s.payBtnText}>Оплатити PRO (199 ₴ / міс)</Text>
                    )}
                </TouchableOpacity>

                <Text style={s.secureText}>
                    <Icon name="lock-closed" size={12} color={COLORS.textMuted} /> Безпечний платіж
                </Text>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgPrimary },
    header: { padding: SPACING.xl, alignItems: 'center', borderBottomLeftRadius: RADIUS.lg, borderBottomRightRadius: RADIUS.lg },
    headerTitle: { ...FONTS.title, color: '#fff', marginTop: SPACING.sm, fontSize: 24 },
    headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4, textAlign: 'center' },
    formContainer: { padding: SPACING.lg },
    sectionTitle: { ...FONTS.bold, fontSize: 18, marginBottom: SPACING.md },
    inputWrapper: { marginBottom: SPACING.md },
    inputLabel: { ...FONTS.caption, marginBottom: 4 },
    input: { backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textPrimary, ...FONTS.medium },
    row: { flexDirection: 'row' },
    payBtn: { backgroundColor: COLORS.accent, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', marginTop: SPACING.md, ...SHADOWS.primary },
    payBtnText: { ...FONTS.bold, color: '#fff', fontSize: 16 },
    secureText: { ...FONTS.caption, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.md },
});
