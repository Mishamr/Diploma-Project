/**
 * App navigator — auth flow + bottom tabs with Gemini theme.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/theme';
import ROUTES from '../constants/routes';

// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProductFeedScreen from '../screens/ProductFeedScreen';
import ShoppingListScreen from '../screens/ShoppingListScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import MapScreen from '../screens/MapScreen';
import PromotionsScreen from '../screens/PromotionsScreen';
import SurvivalScreen from '../screens/SurvivalScreen';
import InflationScreen from '../screens/InflationScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CompareCartScreen from '../screens/CompareCartScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    switch (route.name) {
                        case ROUTES.DASHBOARD:
                            iconName = focused ? 'home' : 'home-outline';
                            break;
                        case ROUTES.PRODUCT_FEED:
                            iconName = focused ? 'search' : 'search-outline';
                            break;
                        case ROUTES.SHOPPING_LIST:
                            iconName = focused ? 'calculator' : 'calculator-outline';
                            break;
                        case ROUTES.ANALYTICS:
                            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
                            break;
                        case ROUTES.AI_ASSISTANT:
                            iconName = focused ? 'sparkles' : 'sparkles-outline';
                            break;
                        default:
                            iconName = 'ellipse';
                    }
                    return <Icon name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textMuted,
                tabBarStyle: {
                    backgroundColor: COLORS.bgSecondary,
                    borderTopColor: COLORS.glassBorder,
                    borderTopWidth: 1,
                    paddingBottom: 4,
                    height: 60,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                },
                headerStyle: {
                    backgroundColor: COLORS.bgPrimary,
                    elevation: 0,
                    boxShadow: 'none',
                },
                headerTintColor: COLORS.textPrimary,
                headerTitleStyle: {
                    fontWeight: '700',
                },
            })}
        >
            <Tab.Screen
                name={ROUTES.DASHBOARD}
                component={DashboardScreen}
                options={{ title: 'Головна', headerShown: false }}
            />
            <Tab.Screen
                name={ROUTES.PRODUCT_FEED}
                component={ProductFeedScreen}
                options={{ title: 'Продукти' }}
            />
            <Tab.Screen
                name={ROUTES.SHOPPING_LIST}
                component={ShoppingListScreen}
                options={{ title: 'Кошик' }}
            />
            <Tab.Screen
                name={ROUTES.ANALYTICS}
                component={AnalyticsScreen}
                options={{ title: 'Аналітика', headerShown: false }}
            />
            <Tab.Screen
                name={ROUTES.AI_ASSISTANT}
                component={AIAssistantScreen}
                options={{ title: 'AI', headerShown: false }}
            />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const { isAuthenticated, loading } = useAuth();

    if (loading) return null;

    return (
        <NavigationContainer
            theme={{
                dark: true,
                colors: {
                    primary: COLORS.primary,
                    background: COLORS.bgPrimary,
                    card: COLORS.bgSecondary,
                    text: COLORS.textPrimary,
                    border: COLORS.glassBorder,
                    notification: COLORS.error,
                },
            }}
        >
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!isAuthenticated ? (
                    <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
                ) : (
                    <>
                        <Stack.Screen name={ROUTES.MAIN} component={MainTabs} />
                        <Stack.Screen
                            name={ROUTES.SETTINGS}
                            component={SettingsScreen}
                            options={{
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name={ROUTES.MAP}
                            component={MapScreen}
                            options={{
                                headerShown: true,
                                title: 'Карта магазинів',
                                headerStyle: { backgroundColor: COLORS.bgPrimary },
                                headerTintColor: COLORS.textPrimary,
                            }}
                        />
                        <Stack.Screen
                            name={ROUTES.PROMOTIONS}
                            component={PromotionsScreen}
                            options={{
                                headerShown: true,
                                title: 'Акції',
                                headerStyle: { backgroundColor: COLORS.bgPrimary },
                                headerTintColor: COLORS.textPrimary,
                            }}
                        />
                        <Stack.Screen
                            name={ROUTES.SURVIVAL}
                            component={SurvivalScreen}
                            options={{
                                headerShown: true,
                                title: 'Режим виживання',
                                headerStyle: { backgroundColor: COLORS.bgPrimary },
                                headerTintColor: COLORS.textPrimary,
                            }}
                        />
                        <Stack.Screen
                            name={ROUTES.INFLATION}
                            component={InflationScreen}
                            options={{
                                headerShown: true,
                                title: 'Аналітика цін',
                                headerStyle: { backgroundColor: COLORS.bgPrimary },
                                headerTintColor: COLORS.textPrimary,
                            }}
                        />
                        <Stack.Screen
                            name={ROUTES.COMPARE_CART}
                            component={CompareCartScreen}
                            options={{
                                headerShown: true,
                                title: 'Порівняння кошика',
                                headerStyle: { backgroundColor: COLORS.bgPrimary },
                                headerTintColor: COLORS.textPrimary,
                            }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
