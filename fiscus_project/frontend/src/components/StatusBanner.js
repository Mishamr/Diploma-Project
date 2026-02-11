/**
 * @fileoverview Status banner component showing sync status.
 * 
 * Displays the current database sync status with animated appearance.
 * Polls the backend every 30 seconds for updates.
 * 
 * @module components/StatusBanner
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { getStatus } from '../api/client';

/**
 * Polling interval in milliseconds.
 * @constant {number}
 */
const POLL_INTERVAL_MS = 30000;

/**
 * Default status message.
 * @constant {string}
 */
const DEFAULT_MESSAGE = 'Syncing with Fiscus Database...';

/**
 * Offline status message.
 * @constant {string}
 */
const OFFLINE_MESSAGE = 'Offline Mode: Using cached prices';

/**
 * StatusBanner component.
 * Shows database sync status with fade-in animation.
 * 
 * @returns {JSX.Element} Status banner component.
 * 
 * @example
 * <StatusBanner />
 */
export default function StatusBanner() {
    const [message, setMessage] = useState(DEFAULT_MESSAGE);
    const [status, setStatus] = useState('loading');

    // Use useRef for Animated.Value to prevent recreation on re-renders
    const fadeAnim = useRef(new Animated.Value(0)).current;

    /**
     * Fade in the banner.
     */
    const fadeIn = useCallback(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: Platform.OS !== 'web',
        }).start();
    }, [fadeAnim]);

    /**
     * Fetch status from API.
     */
    const fetchStatus = useCallback(async () => {
        try {
            const response = await getStatus();

            if (response.data?.message) {
                setMessage(response.data.message);
                setStatus(response.data.status || 'active');
                fadeIn();
            }
        } catch (error) {
            // Don't log network errors to avoid console spam
            if (error.response) {
                console.warn('Status fetch error:', error.response.status);
            }
            setMessage(OFFLINE_MESSAGE);
            setStatus('offline');
            fadeIn();
        }
    }, [fadeIn]);

    /**
     * Set up polling on mount and clean up on unmount.
     */
    useEffect(() => {
        // Initial fetch
        fetchStatus();

        // Set up polling interval
        const intervalId = setInterval(fetchStatus, POLL_INTERVAL_MS);

        // Cleanup on unmount
        return () => {
            clearInterval(intervalId);
        };
    }, [fetchStatus]);

    /**
     * Get status indicator color based on status.
     * @returns {string} Color code.
     */
    const getStatusColor = () => {
        switch (status) {
            case 'active':
                return '#00E676'; // Green
            case 'pending':
                return '#FFC107'; // Yellow
            case 'offline':
                return '#FF5722'; // Orange
            default:
                return '#9E9E9E'; // Gray
        }
    };

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <View style={[styles.indicator, { backgroundColor: getStatusColor() }]} />
            <Text style={[styles.text, { color: getStatusColor() }]}>
                📡 {message}
            </Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1E1E1E',
        padding: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: Platform.select({
            ios: 'Courier',
            android: 'monospace',
            default: 'monospace',
        }),
    },
});
