import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

export default function AdVideoScreen({ navigation }) {
    const { addCoins } = useAuth();
    const [timeLeft, setTimeLeft] = useState(5);
    const [rewarded, setRewarded] = useState(false);

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (!rewarded) {
            handleReward();
        }
    }, [timeLeft, rewarded]);

    const handleReward = async () => {
        setRewarded(true);
        await addCoins(100);
        Alert.alert('Успіх!', 'Ви переглянули відео і отримали 100 монет!', [
            { text: 'OK', onPress: () => navigation.goBack() }
        ]);
    };

    return (
        <View style={s.container}>
            <View style={s.videoMock}>
                <Icon name="play-circle" size={80} color="rgba(255,255,255,0.8)" />
                <Text style={s.mockText}>Рекламне відео відтворюється...</Text>
            </View>
            <View style={s.footer}>
                {timeLeft > 0 ? (
                    <Text style={s.timerText}>Зачекайте {timeLeft} с, щоб отримати винагороду</Text>
                ) : (
                    <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
                        <Text style={s.closeText}>Забрати 100 монет ❌</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111', justifyContent: 'center' },
    videoMock: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    mockText: { ...FONTS.regular, color: 'rgba(255,255,255,0.7)', marginTop: SPACING.lg },
    footer: { padding: SPACING.xl, alignItems: 'center', paddingBottom: 60 },
    timerText: { ...FONTS.bold, color: COLORS.warning, fontSize: 16 },
    closeBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm, borderRadius: RADIUS.full },
    closeText: { ...FONTS.bold, color: '#fff' }
});
