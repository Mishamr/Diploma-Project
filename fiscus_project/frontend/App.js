/**
 * @fileoverview Root Application Component.
 * 
 * Sets up global providers:
 * - SafeAreaProvider (for layout handling)
 * - AuthProvider (authentication state)
 * - CartProvider (shopping cart state)
 * - AppNavigator (navigation)
 * 
 * Also configures global status bar style.
 * 
 * @module App
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Navigation & Context
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';

// Theme
import { colors } from './src/theme';

/**
 * Main App Component.
 * 
 * Structure:
 * SafeAreaProvider -> AuthProvider -> CartProvider -> AppNavigator
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <StatusBar style="light" backgroundColor={colors.background} />
          <AppNavigator />
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
