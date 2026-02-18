import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Image,
    SafeAreaView,
    Keyboard
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { compareProducts } from '../api/client';
import { theme, colors, spacing, typography, getShadow } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PriceCheckScreen = () => {
    const navigation = useNavigation();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searched, setSearched] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setSearched(true);
        Keyboard.dismiss();

        try {
            const response = await compareProducts(query);
            // API returns list of { store_name, product_name, price, image_url, url, is_real }
            // Some results might be from simulation (is_real=False/undefined)
            setResults(response.data || []);
        } catch (err) {
            console.error('Search failed:', err);
            setError('Не вдалося знайти товари. Спробуйте пізніше.');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.imageContainer}>
                {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="contain" />
                ) : (
                    <View style={[styles.image, styles.placeholderImage]}>
                        <Ionicons name="basket" size={24} color={colors.textMuted} />
                    </View>
                )}
            </View>

            <View style={styles.infoContainer}>
                <Text style={styles.productName} numberOfLines={2}>{item.product_name}</Text>
                <View style={styles.storeRow}>
                    <Ionicons name="storefront" size={14} color={colors.primary} />
                    <Text style={styles.storeName}>{item.store_name}</Text>
                </View>

                {item.is_real ? (
                    <View style={styles.badgeReal}>
                        <Text style={styles.badgeText}>Real Data</Text>
                    </View>
                ) : (
                    <View style={styles.badgeSim}>
                        <Text style={styles.badgeText}>Demo</Text>
                    </View>
                )}
            </View>

            <View style={styles.priceContainer}>
                <Text style={styles.price}>₴{item.price.toFixed(2)}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Перевірка цін</Text>
            </View>

            <View style={styles.searchSection}>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color={colors.textMuted} />
                    <TextInput
                        style={styles.input}
                        placeholder="Назва товару (напр. Молоко)"
                        placeholderTextColor={colors.textMuted}
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                    <Text style={styles.searchButtonText}>Пошук</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Шукаємо найкращі ціни...</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : (
                <FlatList
                    data={results}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        searched ? (
                            <View style={styles.center}>
                                <Text style={styles.emptyText}>Нічого не знайдено 😔</Text>
                            </View>
                        ) : (
                            <View style={styles.center}>
                                <Ionicons name="pricetags-outline" size={64} color={colors.surfaceLight} />
                                <Text style={styles.placeholderText}>Введіть назву товару, щоб порівняти ціни в реальному часі</Text>
                            </View>
                        )
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: spacing.s,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginLeft: spacing.m,
    },
    searchSection: {
        flexDirection: 'row',
        padding: spacing.m,
        gap: spacing.s,
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: theme.borderRadius.m,
        paddingHorizontal: spacing.m,
        borderWidth: 1,
        borderColor: colors.border,
    },
    input: {
        flex: 1,
        paddingVertical: spacing.m,
        marginLeft: spacing.s,
        color: colors.text,
        fontSize: 16,
    },
    searchButton: {
        backgroundColor: colors.primary,
        justifyContent: 'center',
        paddingHorizontal: spacing.l,
        borderRadius: theme.borderRadius.m,
    },
    searchButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    list: {
        padding: spacing.m,
        paddingBottom: spacing.xxl,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: theme.borderRadius.m,
        marginBottom: spacing.m,
        padding: spacing.m,
        alignItems: 'center',
        ...getShadow('small'),
    },
    imageContainer: {
        width: 60,
        height: 60,
        borderRadius: theme.borderRadius.s,
        overflow: 'hidden',
        backgroundColor: '#fff',
        marginRight: spacing.m,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContainer: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    storeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    storeName: {
        fontSize: 14,
        color: colors.textMuted,
        marginLeft: 4,
    },
    badgeReal: {
        backgroundColor: 'rgba(74, 222, 128, 0.2)',
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeSim: {
        backgroundColor: 'rgba(250, 204, 21, 0.2)',
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.text,
    },
    priceContainer: {
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginLeft: spacing.m,
    },
    price: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.success,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    loadingText: {
        marginTop: spacing.m,
        color: colors.textMuted,
    },
    errorText: {
        color: colors.danger,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 18,
        color: colors.textMuted,
    },
    placeholderText: {
        marginTop: spacing.m,
        textAlign: 'center',
        color: colors.textMuted,
        lineHeight: 24,
    },
});

export default PriceCheckScreen;
