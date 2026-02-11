/**
 * @fileoverview Main navigation configuration for Fiscus app.
 * 
 * Uses React Navigation with Stack Navigator.
 * Implements dark fintech theme consistent with app design.
 * Includes protected route logic based on authentication status.
 * 
 * @module navigation/AppNavigator
 */

import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import ProductFeed from '../screens/ProductFeed';
import ShoppingListScreen from '../screens/ShoppingListScreen';
import CartScreen from '../screens/CartScreen';
import MapScreen from '../screens/MapScreen';
import ComparisonScreen from '../screens/ComparisonScreen';
import LoginScreen from '../screens/LoginScreen';
import SurvivalScreen from '../screens/SurvivalScreen';
import PromotionsScreen from '../screens/PromotionsScreen';

// Context & Theme
import { AuthContext } from '../context/AuthContext';
import { theme, colors } from '../theme';

/**
 * Stack navigator instance.
 */
const Stack = createStackNavigator();

/**
 * Custom dark theme extending React Navigation's DarkTheme.
 * Integrates with Fiscus design system.
 */
const FiscusDarkTheme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

/**
 * Default screen options for all screens.
 * Provides consistent header styling.
 */
const defaultScreenOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: colors.background,
  },
};

/**
 * Public screens (accessible without authentication).
 */
const publicScreens = [
  {
    name: 'Login',
    component: LoginScreen,
    options: {
      title: 'Вхід',
    },
  },
];

/**
 * Protected screens (require authentication for premium features).
 * Note: Basic browsing is allowed, premium features require login.
 */
const appScreens = [
  {
    name: 'Home',
    component: ProductFeed,
    options: {
      title: 'FISCUS',
      headerTitleStyle: {
        fontWeight: '900',
        fontSize: 20,
        letterSpacing: 2,
      },
    },
  },
  {
    name: 'Promotions',
    component: PromotionsScreen,
    options: {
      title: '🔥 Акції',
      headerStyle: {
        backgroundColor: colors.dangerLight || colors.surface,
      },
    },
  },
  {
    name: 'ShoppingList',
    component: ShoppingListScreen,
    options: {
      title: 'Список покупок',
    },
  },
  {
    name: 'Cart',
    component: CartScreen,
    options: {
      title: 'Мій Кошик',
    },
  },
  {
    name: 'Map',
    component: MapScreen,
    options: {
      title: 'Карта магазинів',
    },
  },
  {
    name: 'Comparison',
    component: ComparisonScreen,
    options: {
      title: 'Smart Comparison',
      headerStyle: {
        backgroundColor: colors.secondaryLight,
      },
      headerTintColor: colors.secondary,
    },
  },
  {
    name: 'Login',
    component: LoginScreen,
    options: {
      title: 'Вхід',
    },
  },
  {
    name: 'Survival',
    component: SurvivalScreen,
    options: {
      title: 'Survival Mode',
      headerStyle: {
        backgroundColor: colors.secondaryLight,
      },
      headerTintColor: colors.secondary,
    },
  },
];

/**
 * Main App Navigator component.
 * Provides navigation structure for the entire app.
 * Uses AuthContext to determine initial route and show loading state.
 * 
 * @returns {JSX.Element} Navigation container with stack navigator.
 * 
 * @example
 * <AppNavigator />
 */
export default function AppNavigator() {
  const { isInitializing, isAuthenticated } = useContext(AuthContext);

  // Show loading screen while checking auth status
  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={FiscusDarkTheme}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={defaultScreenOptions}
      >
        {appScreens.map((screen) => (
          <Stack.Screen
            key={screen.name}
            name={screen.name}
            component={screen.component}
            options={screen.options}
          />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
