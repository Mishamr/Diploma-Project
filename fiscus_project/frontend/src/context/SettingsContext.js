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
            }
        } catch (e) {
            console.error('Error loading settings', e);
        } finally {
            setIsLoaded(true);
        }
    };

    const saveSettings = async (newSettings) => {
        try {
            const current = { viewMode, budget, enabledChains, ...newSettings };
            await AsyncStorage.setItem('@settings', JSON.stringify(current));

            if (newSettings.viewMode) setViewMode(newSettings.viewMode);
            if (newSettings.budget) setBudget(newSettings.budget);
            if (newSettings.enabledChains) setEnabledChains(newSettings.enabledChains);
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

    return (
        <SettingsContext.Provider value={{
            viewMode,
            budget,
            enabledChains,
            isLoaded,
            toggleChain,
            updateViewMode,
            updateBudget
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = () => useContext(SettingsContext);
