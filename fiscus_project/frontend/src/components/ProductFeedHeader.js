import React, { memo } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

/**
 * Header component for ProductFeed.
 * Extracted to prevent re-renders of the input field when parent state changes.
 * This fixes the "keyboard dismiss on type" bug.
 */
const ProductFeedHeader = memo(({
    searchQuery,
    setSearchQuery,
    onSearch,
    onBarcodeScan,
    navigation
}) => {
    return (
        <View style={styles.headerContainer}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search products..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={onSearch}
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>
            <TouchableOpacity style={styles.iconButton} onPress={onBarcodeScan}>
                <Ionicons name="barcode-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Cart')}>
                <Ionicons name="cart-outline" size={24} color={colors.text} />
            </TouchableOpacity>
        </View>
    );
});

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 40,
        marginRight: 10,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: colors.text,
        fontSize: 16,
    },
    iconButton: {
        padding: 5,
        marginLeft: 5,
    },
});

export default ProductFeedHeader;
