import React, { useEffect, useRef, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { AuthContext } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;

/**
 * Get initials from a name for avatar display.
 */
const getInitials = (name) => {
    if (!name) return 'MS';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const MenuItem = ({ icon, label, onPress, active = false, isPremium = false }) => (
    <TouchableOpacity
        style={[styles.menuItem, active && styles.menuItemActive]}
        onPress={onPress}
    >
        <Ionicons
            name={icon}
            size={20}
            color={active ? theme.colors.primary : theme.colors.textMuted}
            style={{ width: 24 }}
        />
        <Text style={[
            styles.menuItemText,
            active && styles.menuItemTextActive,
            isPremium && styles.premiumText
        ]}>
            {label}
        </Text>
        {isPremium && (
            <Ionicons name="sparkles" size={14} color={theme.colors.success} style={{ marginLeft: 8 }} />
        )}
    </TouchableOpacity>
);

export const Sidebar = ({ isOpen, onClose }) => {
    const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const navigation = useNavigation();
    const { user, isAuthenticated, isPremium } = useContext(AuthContext);

    // User display data - use AuthContext user or default
    const userName = user?.first_name
        ? `${user.first_name} ${user.last_name || ''}`.trim()
        : (isAuthenticated ? user?.username : 'Misha Savchuk');
    const userStatus = isPremium ? 'Premium Member' : (isAuthenticated ? 'Користувач' : 'Гість');
    const userInitials = getInitials(userName);

    useEffect(() => {
        if (isOpen) {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -SIDEBAR_WIDTH,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isOpen]);

    const handleNavigation = (screen) => {
        onClose();
        navigation.navigate(screen);
    };

    if (!isOpen && slideAnim._value === -SIDEBAR_WIDTH) return null;

    return (
        <>
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} pointerEvents={isOpen ? 'auto' : 'none'}>
                <TouchableOpacity style={styles.overlayTouch} onPress={onClose} activeOpacity={1} />
            </Animated.View>

            <Animated.View style={[styles.container, { transform: [{ translateX: slideAnim }] }]}>
                {/* Header / Profile */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View style={styles.logoRow}>
                            <View style={styles.logoIcon}>
                                <Ionicons name="receipt" size={16} color={theme.colors.background} />
                            </View>
                            <Text style={styles.logoText}>Fiscus</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.profileCard}>
                        <View style={styles.avatarInitials}>
                            <Text style={styles.avatarInitialsText}>{userInitials}</Text>
                        </View>
                        <View>
                            <Text style={styles.profileName}>{userName}</Text>
                            <Text style={styles.profileStatus}>{userStatus}</Text>
                        </View>
                    </View>
                </View>

                {/* Navigation */}
                <View style={styles.menuContainer}>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Main</Text>
                        <MenuItem
                            icon="home"
                            label="Dashboard"
                            active={true}
                            onPress={() => handleNavigation('Comparison')}
                        />
                        <MenuItem
                            icon="cart"
                            label="Shopping Lists"
                            onPress={() => handleNavigation('ShoppingList')}
                        />
                        <MenuItem
                            icon="map"
                            label="Store Locator"
                            onPress={() => handleNavigation('Map')}
                        />
                        <MenuItem
                            icon="trending-up"
                            label="Price Trends"
                            onPress={() => handleNavigation('Promotions')}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Premium</Text>
                        <MenuItem
                            icon="shield-checkmark"
                            label="Survival Mode"
                            isPremium
                            onPress={() => handleNavigation('Survival')}
                        />
                        <MenuItem
                            icon="restaurant"
                            label="Meal Planner"
                            onPress={() => handleNavigation('Survival')}
                        />
                        <MenuItem
                            icon="navigate"
                            label="Route Optimizer"
                            onPress={() => handleNavigation('Map')}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Account</Text>
                        <MenuItem
                            icon="settings"
                            label="Settings"
                            onPress={() => handleNavigation('Login')}
                        />
                        <MenuItem
                            icon="help-circle"
                            label="Help & Support"
                            onPress={() => { }}
                        />
                    </View>
                </View>
            </Animated.View>
        </>
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: theme.colors.overlay,
        zIndex: theme.zIndex.modal - 1,
    },
    overlayTouch: {
        flex: 1,
    },
    container: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: SIDEBAR_WIDTH,
        backgroundColor: theme.colors.surface,
        zIndex: theme.zIndex.modal,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
        paddingTop: theme.spacing.xl, // Safe area top
    },
    header: {
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.l,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: theme.fontSize.title,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.primary,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceLight,
        padding: theme.spacing.s,
        borderRadius: theme.borderRadius.l,
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.border,
    },
    avatarInitials: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitialsText: {
        color: theme.colors.textInverse,
        fontSize: 16,
        fontWeight: 'bold',
    },
    profileName: {
        color: theme.colors.text,
        fontSize: theme.fontSize.caption,
        fontWeight: theme.fontWeight.bold,
    },
    profileStatus: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.small,
    },
    menuContainer: {
        padding: theme.spacing.m,
    },
    section: {
        marginBottom: theme.spacing.l,
    },
    sectionTitle: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: theme.spacing.s,
        paddingLeft: theme.spacing.s,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.s,
        paddingHorizontal: theme.spacing.s,
        borderRadius: theme.borderRadius.m,
        marginBottom: 4,
    },
    menuItemActive: {
        backgroundColor: theme.colors.surfaceLight,
    },
    menuItemText: {
        marginLeft: 12,
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.body,
        fontWeight: theme.fontWeight.medium,
    },
    menuItemTextActive: {
        color: theme.colors.primary,
        fontWeight: theme.fontWeight.bold,
    },
    premiumText: {
        color: theme.colors.success,
    },
});

export default Sidebar;
