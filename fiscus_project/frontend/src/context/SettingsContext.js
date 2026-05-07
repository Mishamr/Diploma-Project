import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CHAINS } from '../constants/stores';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
    const [viewMode, setViewMode] = useState('list');
    const [budget, setBudget] = useState(5000);
    const [enabledChains, setEnabledChains] = useState(
        CHAINS.reduce((acc, c) => ({ ...acc, [c.slug]: true }), {})
    );
    const [notifications, setNotifications] = useState(true);
    const [currency, setCurrency] = useState('₴');
    const [language, setLanguage] = useState('uk');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const stored = await AsyncStorage.getItem('@settings');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.viewMode) setViewMode(parsed.viewMode);
                if (parsed.budget) setBudget(parsed.budget);
                if (parsed.enabledChains) setEnabledChains(parsed.enabledChains);
                if (parsed.notifications !== undefined) setNotifications(parsed.notifications);
                if (parsed.currency) setCurrency(parsed.currency);
                if (parsed.language) setLanguage(parsed.language);
            }
        } catch (e) {
            console.error('Error loading settings', e);
        } finally {
            setIsLoaded(true);
        }
    };

    const saveSettings = async (newSettings) => {
        try {
            const current = { viewMode, budget, enabledChains, notifications, currency, language, ...newSettings };
            await AsyncStorage.setItem('@settings', JSON.stringify(current));

            if (newSettings.viewMode !== undefined) setViewMode(newSettings.viewMode);
            if (newSettings.budget !== undefined) setBudget(newSettings.budget);
            if (newSettings.enabledChains) setEnabledChains(newSettings.enabledChains);
            if (newSettings.notifications !== undefined) setNotifications(newSettings.notifications);
            if (newSettings.currency !== undefined) setCurrency(newSettings.currency);
            if (newSettings.language !== undefined) setLanguage(newSettings.language);
        } catch (e) {
            console.error('Error saving settings', e);
        }
    };

    const toggleChain = (slug) => {
        const updatedChains = { ...enabledChains, [slug]: !enabledChains[slug] };
        saveSettings({ enabledChains: updatedChains });
    };

    const updateViewMode = (mode) => saveSettings({ viewMode: mode });
    const updateBudget = (val) => saveSettings({ budget: val });
    const updateNotifications = (val) => saveSettings({ notifications: val });
    const updateCurrency = (val) => saveSettings({ currency: val });
    const updateLanguage = (val) => saveSettings({ language: val });

    return (
        <SettingsContext.Provider value={{
            viewMode,
            budget,
            enabledChains,
            notifications,
            currency,
            language,
            isLoaded,
            toggleChain,
            updateViewMode,
            updateBudget,
            updateNotifications,
            updateCurrency,
            updateLanguage,
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = () => useContext(SettingsContext);
