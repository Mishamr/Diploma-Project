import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export const Header = ({ onMenuPress, title }) => {
    const handleNotifications = () => {
        Alert.alert(
            '🔔 Сповіщення',
            'У вас немає нових сповіщень.\n\nФункція сповіщень буде доступна у наступному оновленні.',
            [{ text: 'OK' }]
        );
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.button} onPress={onMenuPress}>
                <Ionicons name="menu" size={24} color={theme.colors.primary} />
            </TouchableOpacity>

            <View style={styles.titleContainer}>
                <View style={styles.iconContainer}>
                    <Ionicons name="receipt" size={14} color={theme.colors.background} />
                </View>
                <Text style={styles.title}>Fiscus</Text>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleNotifications}>
                <Ionicons name="notifications-outline" size={24} color={theme.colors.primary} />
                <View style={styles.badge} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        zIndex: theme.zIndex.base + 1,
    },
    button: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.borderRadius.m,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.colors.primary, // Using gradient approximation if single color
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.subtitle,
        fontWeight: theme.fontWeight.bold,
        letterSpacing: 0.5,
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.danger,
        borderWidth: 1,
        borderColor: theme.colors.surface,
    },
});

export default Header;
