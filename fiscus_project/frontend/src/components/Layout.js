import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { theme } from '../theme';

export const Layout = ({ children, title = 'Fiscus' }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <Header
                    title={title}
                    onMenuPress={() => setIsSidebarOpen(true)}
                />
                <View style={styles.content}>
                    {children}
                </View>
            </SafeAreaView>
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    safeArea: {
        flex: 1,
        marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    content: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
});

export default Layout;
