import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import ROUTES from '../constants/routes';

export default function StoreScreen({ navigation }) {
    const { user, addCoins, buyTickets, upgradeToPro } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleAddCoins = async () => {
        setLoading(true);
        await addCoins(100);
        setLoading(false);
    };

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
                    <Icon name="ticket" size={24} color={COLORS.accent} />
                    <Text style={s.balanceLabel}>Тікети</Text>
                    <Text style={s.balanceValue}>{user?.tickets || 0}</Text>
                </View>
                <View style={s.balanceDivider} />
                <View style={s.balanceStat}>
                    <Icon name="cash" size={24} color={COLORS.warning} />
                    <Text style={s.balanceLabel}>Монети</Text>
                    <Text style={s.balanceValue}>{user?.coins || 0}</Text>
                </View>
            </View>

            <Text style={s.sectionTitle}>Фармінг монет</Text>
            <TouchableOpacity style={s.earnBtn} onPress={handleAddCoins} disabled={loading}>
                <Icon name="play-circle" size={24} color="#fff" />
                <Text style={s.earnBtnText}>Отримати 100 монет (Реклама)</Text>
            </TouchableOpacity>

            <Text style={s.sectionTitle}>Магазин Тікетів</Text>
            
            <View style={s.packageRow}>
                <TouchableOpacity style={s.packageCard} onPress={() => handleBuyTickets('small')} disabled={loading}>
                    <Icon name="ticket" size={32} color={COLORS.accent} />
                    <Text style={s.packageAmount}>5 Тікетів</Text>
                    <View style={s.packagePrice}>
                        <Icon name="cash" size={16} color={COLORS.warning} />
                        <Text style={s.packagePriceText}>50</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={s.packageCard} onPress={() => handleBuyTickets('large')} disabled={loading}>
                    <Icon name="ticket" size={32} color={COLORS.accent} />
                    <Text style={s.packageAmount}>15 Тікетів</Text>
                    <View style={s.packagePrice}>
                        <Icon name="cash" size={16} color={COLORS.warning} />
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
    balanceDivider: { width: 1, backgroundColor: COLORS.borderLight, marginHorizontal: SPACING.md },
    balanceLabel: { ...FONTS.caption, marginTop: 4 },
    balanceValue: { ...FONTS.title, fontSize: 24, marginTop: 4 },
    
    sectionTitle: { ...FONTS.bold, fontSize: 18, marginBottom: SPACING.md, marginTop: SPACING.md },
    earnBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight, padding: SPACING.md, borderRadius: RADIUS.md, gap: 8 },
    earnBtnText: { ...FONTS.bold, color: '#fff' },

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
