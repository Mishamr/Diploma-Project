import React from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { SettingsProvider } from './src/context/SettingsContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
    return (
        <GestureHandlerRootView style={[{ flex: 1 }, Platform.OS === 'web' && { height: '100vh' }]}>
            <SafeAreaProvider>
                <SettingsProvider>
                    <AuthProvider>
                        <FavoritesProvider>
                            <CartProvider>
                                <StatusBar style="light" />
                                <AppNavigator />
                            </CartProvider>
                        </FavoritesProvider>
                    </AuthProvider>
                </SettingsProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
