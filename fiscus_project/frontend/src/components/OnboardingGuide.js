/**
 * @fileoverview Onboarding guide component for Fiscus app.
 * 
 * Displays a multi-step tutorial on first launch.
 * Uses AsyncStorage to track completion status.
 * 
 * @module components/OnboardingGuide
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme, colors, spacing, typography } from '../theme';

/**
 * Storage key for onboarding completion status.
 * @constant {string}
 */
const ONBOARDING_KEY = 'fiscus_onboarding_complete';

/**
 * Onboarding step configuration.
 * @type {Array<{icon: string, title: string, description: string}>}
 */
const ONBOARDING_STEPS = [
    {
        icon: '📊',
        title: 'Порівнюйте ціни',
        description: 'Fiscus знаходить найкращі ціни у магазинах вашого міста.',
    },
    {
        icon: '🛒',
        title: 'Створюйте списки',
        description: 'Додавайте товари до кошика та оптимізуйте маршрут по магазинах.',
    },
    {
        icon: '📍',
        title: 'Знаходьте поруч',
        description: 'Дивіться магазини на карті та обирайте найближчий з найкращою ціною.',
    },
    {
        icon: '🏆',
        title: 'Smart Analysis',
        description: 'Premium: аналізуйте якість товарів та отримуйте рекомендації.',
    },
];

/**
 * OnboardingGuide component.
 * Shows a tutorial modal on first app launch.
 * 
 * @returns {JSX.Element|null} Modal component or null if completed.
 * 
 * @example
 * // Include in root component
 * <OnboardingGuide />
 */
export default function OnboardingGuide() {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Animation value
    const fadeAnim = useRef(new Animated.Value(0)).current;

    /**
     * Check if user has completed onboarding.
     */
    useEffect(() => {
        checkOnboardingStatus();
    }, []);

    /**
     * Animate step transition when step changes.
     */
    useEffect(() => {
        if (isVisible) {
            // Reset and animate
            fadeAnim.setValue(0);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        }
    }, [currentStep, isVisible, fadeAnim]);

    /**
     * Check AsyncStorage for onboarding completion.
     */
    const checkOnboardingStatus = async () => {
        try {
            const completed = await AsyncStorage.getItem(ONBOARDING_KEY);

            if (!completed) {
                setIsVisible(true);
            }
        } catch (error) {
            console.error('Error checking onboarding status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Mark onboarding as complete and close modal.
     */
    const completeOnboarding = useCallback(async () => {
        try {
            await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
            setIsVisible(false);
        } catch (error) {
            console.error('Error saving onboarding status:', error);
            // Close anyway to not block user
            setIsVisible(false);
        }
    }, []);

    /**
     * Navigate to next step or complete.
     */
    const handleNext = useCallback(() => {
        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setCurrentStep((prev) => prev + 1);
        } else {
            completeOnboarding();
        }
    }, [currentStep, completeOnboarding]);

    /**
     * Navigate to previous step.
     */
    const handleBack = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
        }
    }, [currentStep]);

    // Don't render while loading
    if (isLoading) {
        return null;
    }

    // Get current step data
    const step = ONBOARDING_STEPS[currentStep];
    const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

    return (
        <Modal
            visible={isVisible}
            animationType="fade"
            transparent
            onRequestClose={handleNext}
        >
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.card,
                        { opacity: fadeAnim, transform: [{ scale: fadeAnim }] },
                    ]}
                >
                    {/* Step indicator */}
                    <View style={styles.stepIndicator}>
                        {ONBOARDING_STEPS.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    index === currentStep && styles.dotActive,
                                ]}
                            />
                        ))}
                    </View>

                    {/* Content */}
                    <Text style={styles.icon}>{step.icon}</Text>
                    <Text style={styles.title}>{step.title}</Text>
                    <Text style={styles.description}>{step.description}</Text>

                    {/* Navigation buttons */}
                    <View style={styles.buttons}>
                        {currentStep > 0 && (
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleBack}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.backButtonText}>Назад</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.nextButton}
                            onPress={handleNext}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.nextButtonText}>
                                {isLastStep ? 'Почати' : 'Далі'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Skip button */}
                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={completeOnboarding}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.skipButtonText}>Пропустити</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.l,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    stepIndicator: {
        flexDirection: 'row',
        marginBottom: spacing.l,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.borderLight,
        marginHorizontal: 4,
    },
    dotActive: {
        backgroundColor: colors.primary,
        width: 24,
    },
    icon: {
        fontSize: 64,
        marginBottom: spacing.m,
    },
    title: {
        ...typography.title,
        color: colors.text,
        marginBottom: spacing.s,
        textAlign: 'center',
    },
    description: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.l,
        lineHeight: 24,
    },
    buttons: {
        flexDirection: 'row',
        gap: spacing.m,
        marginBottom: spacing.m,
    },
    backButton: {
        paddingVertical: spacing.s,
        paddingHorizontal: spacing.l,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: colors.border,
    },
    backButtonText: {
        color: colors.textSecondary,
        fontWeight: '600',
        fontSize: 16,
    },
    nextButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.s + 4,
        paddingHorizontal: spacing.xl,
        borderRadius: theme.borderRadius.m,
    },
    nextButtonText: {
        color: colors.textInverse,
        fontWeight: '700',
        fontSize: 16,
    },
    skipButton: {
        paddingVertical: spacing.s,
    },
    skipButtonText: {
        color: colors.textMuted,
        fontSize: 14,
    },
});
