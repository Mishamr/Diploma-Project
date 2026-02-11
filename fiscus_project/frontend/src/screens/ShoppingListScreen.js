/**
 * @fileoverview Shopping List Screen.
 * 
 * Displays user's saved shopping lists with price comparison summaries.
 * 
 * @module screens/ShoppingListScreen
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// API
import { getShoppingLists, createShoppingList, deleteShoppingList } from '../api/client';

// Components & Theme
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { theme, colors, spacing, typography } from '../theme';

/**
 * Shopping List Item Component.
 */
const ListItem = ({ item, onPress, onDelete, onCompare }) => (
  <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(item)}>
    <Card style={styles.listCard}>
      <View style={styles.listHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.listTitle}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.total_items || 0} товарів • {new Date(item.created_at).toLocaleDateString('uk-UA')}
          </Text>
        </View>
        <TouchableOpacity onPress={() => onDelete(item)}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.listDetails}>
        <View>
          <Text style={styles.detailLabel}>Найкраща ціна в</Text>
          <Text style={styles.detailValueSuccess}>
            {item.best_store || 'Аналіз...'}
            {item.distance ? ` • ${item.distance}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.detailLabel}>Всього</Text>
          <Text style={styles.totalPrice}>
            {item.total_price ? `₴${item.total_price}` : '--'}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${item.progress || 0}%` }]} />
      </View>
      <Text style={styles.progressText}>{item.progress || 0}% знайдено</Text>

      <TouchableOpacity style={styles.compareButton} onPress={() => onCompare(item)}>
        <Text style={styles.buttonText}>Порівняти магазини</Text>
      </TouchableOpacity>
    </Card>
  </TouchableOpacity>
);

/**
 * Shopping List Screen Component.
 */
export default function ShoppingListScreen({ navigation }) {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Fetch lists from API.
   */
  const fetchLists = useCallback(async () => {
    try {
      const response = await getShoppingLists();
      setLists(response.data || []);
    } catch (error) {
      console.error('Failed to load shopping lists:', error);
      // Show empty state on error
      setLists([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * Create a new shopping list.
   */
  const createList = async () => {
    try {
      const name = `Shopping List ${new Date().toLocaleDateString()}`;
      await createShoppingList({ name });
      fetchLists(); // Refresh the list
    } catch (error) {
      console.error('Failed to create shopping list:', error);
    }
  };

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      fetchLists();
    }, [fetchLists])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLists();
  }, [fetchLists]);

  /**
   * Delete a shopping list with confirmation.
   */
  const deleteList = async (item) => {
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteShoppingList(item.id);
              fetchLists();
            } catch (error) {
              console.error('Failed to delete list:', error);
            }
          },
        },
      ]
    );
  };

  /**
   * Navigate to compare all stores for this list.
   */
  const handleCompare = (item) => {
    navigation.navigate('Map', { shoppingListId: item.id });
  };

  const handlePress = (item) => {
    console.log('Opened list:', item.id);
  };

  return (
    <Layout title="Shopping Lists">
      <FlatList
        data={lists}
        renderItem={({ item }) => (
          <ListItem
            item={item}
            onPress={handlePress}
            onDelete={deleteList}
            onCompare={handleCompare}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Ionicons name="basket-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                No shopping lists yet.
              </Text>
              <Text style={styles.emptySubText}>
                Create one to start saving!
              </Text>
            </View>
          )
        }
      />

      {/* FAB for creating new list */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={createList}
      >
        <Ionicons name="add" size={32} color={colors.background} />
      </TouchableOpacity>
    </Layout>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: spacing.m,
  },
  listCard: {
    marginBottom: spacing.m,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.m,
  },
  listTitle: {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.semibold,
    color: colors.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: theme.fontSize.small,
    color: colors.textMuted,
  },
  listDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.m,
  },
  detailLabel: {
    fontSize: theme.fontSize.small,
    color: colors.textMuted,
    marginBottom: 4,
  },
  detailValueSuccess: {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.semibold,
    color: colors.success,
  },
  totalPrice: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: colors.success,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.success,
  },
  progressText: {
    fontSize: theme.fontSize.small,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing.m,
  },
  compareButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.s + 4,
    borderRadius: theme.borderRadius.m,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.primary,
    fontWeight: theme.fontWeight.semibold,
    fontSize: theme.fontSize.body,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: spacing.xxl * 2,
  },
  emptyText: {
    fontSize: theme.fontSize.subtitle,
    color: colors.text,
    marginTop: spacing.m,
    fontWeight: theme.fontWeight.bold,
  },
  emptySubText: {
    fontSize: theme.fontSize.body,
    color: colors.textMuted,
    marginTop: spacing.s,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
});
