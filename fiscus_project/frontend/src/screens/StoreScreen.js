import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import ROUTES from '../constants/routes';

export default function StoreScreen({ navigation }) {
    const { user, buyTickets } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleBuyTickets = async (pkg) => {
        setLoading(true);
        const res = await buyTickets(pkg);
        setLoading(false);
        if (res?.error) {
            Alert.alert('Помилка', res.error);
        } else if (res) {
            Alert.alert('Успіх', 'Тікети успішно придбано!');
        }
    };

    return (
        <View style={s.container}>
            <View style={s.balanceCard}>
                <View style={s.balanceStat}>
                    <View style={[s.iconBox, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                        <Icon name="ticket" size={28} color={COLORS.accent} />
                    </View>
                    <Text style={s.balanceValue}>{user?.tickets || 0}</Text>
                    <Text style={s.balanceLabel}>Тікети</Text>
                </View>
                <View style={s.balanceDivider} />
                <View style={s.balanceStat}>
                    <View style={[s.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                        <Icon name="coin" size={28} color={COLORS.warning} />
                    </View>
                    <Text style={s.balanceValue}>{user?.coins || 0}</Text>
                    <Text style={s.balanceLabel}>Монети</Text>
                </View>
            </View>

            <Text style={s.sectionTitle}>Фармінг монет</Text>
            <TouchableOpacity style={[s.gameBtn, { backgroundColor: COLORS.primaryLight }]} onPress={() => navigation.navigate(ROUTES.AD_VIDEO)}>
                <View style={s.gameGradient}>
                    <Icon name="play-circle" size={36} color={COLORS.accent} />
                    <View style={s.gameBtnTextContainer}>
                        <Text style={s.gameBtnTitle}>Переглянути відео</Text>
                        <Text style={s.gameBtnSub}>Отримай 100 монет за перегляд!</Text>
                    </View>
                    <Icon name="chevron-forward" size={24} color="rgba(255,255,255,0.5)" />
                </View>
            </TouchableOpacity>

            <Text style={s.sectionTitle}>Магазин Тікетів</Text>
            
            <View style={s.packageRow}>
                <TouchableOpacity style={s.packageCard} onPress={() => handleBuyTickets('small')} disabled={loading}>
                    <View style={[s.iconBoxSmall, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                        <Icon name="ticket" size={32} color={COLORS.accent} />
                    </View>
                    <Text style={s.packageAmount}>5 Тікетів</Text>
                    <View style={s.packagePrice}>
                        <Icon name="coin" size={16} color={COLORS.warning} />
                        <Text style={s.packagePriceText}>50</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={s.packageCard} onPress={() => handleBuyTickets('large')} disabled={loading}>
                    <View style={[s.iconBoxSmall, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                        <Icon name="ticket" size={32} color={COLORS.accent} />
                    </View>
                    <Text style={s.packageAmount}>15 Тікетів</Text>
                    <View style={s.packagePrice}>
                        <Icon name="coin" size={16} color={COLORS.warning} />
                        <Text style={s.packagePriceText}>100</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {!user?.is_pro && (
                <View style={{ marginTop: SPACING.xl }}>
                    <Text style={s.sectionTitle}>PRO Підписка</Text>
                    <TouchableOpacity 
                        style={s.proBtn} 
                        onPress={() => navigation.navigate(ROUTES.PAYMENT)}
                    >
                        <LinearGradient colors={[COLORS.primary, '#000']} style={s.proGradient}>
                            <Icon name="star" size={24} color={COLORS.accent} />
                            <Text style={s.proBtnText}>Оформити PRO (199 ₴)</Text>
                            <Text style={s.proBtnSub}>Безлімітні тікети та Deep AI</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgPrimary, padding: SPACING.lg },
    balanceCard: { flexDirection: 'row', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg, ...SHADOWS.card },
    balanceStat: { flex: 1, alignItems: 'center' },
    iconBox: { width: 56, height: 56, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    iconBoxSmall: { width: 48, height: 48, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    balanceDivider: { width: 1, backgroundColor: COLORS.borderLight, marginHorizontal: SPACING.md },
    balanceLabel: { ...FONTS.caption, color: 'rgba(255,255,255,0.6)' },
    balanceValue: { ...FONTS.title, fontSize: 28 },
    
    sectionTitle: { ...FONTS.bold, fontSize: 18, marginBottom: SPACING.md, marginTop: SPACING.md },
    gameBtn: { borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.card },
    gameGradient: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
    gameBtnTextContainer: { flex: 1 },
    gameBtnTitle: { ...FONTS.bold, color: '#fff', fontSize: 18 },
    gameBtnSub: { ...FONTS.caption, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

    packageRow: { flexDirection: 'row', gap: SPACING.md },
    packageCard: { flex: 1, backgroundColor: COLORS.bgCard, padding: SPACING.lg, borderRadius: RADIUS.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderLight },
    packageAmount: { ...FONTS.bold, marginVertical: 8 },
    packagePrice: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.full },
    packagePriceText: { ...FONTS.bold, color: COLORS.warning },

    proBtn: { borderRadius: RADIUS.lg, overflow: 'hidden' },
    proGradient: { padding: SPACING.lg, alignItems: 'center' },
    proBtnText: { ...FONTS.bold, color: '#fff', fontSize: 18, marginTop: 8 },
    proBtnSub: { ...FONTS.caption, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
});
