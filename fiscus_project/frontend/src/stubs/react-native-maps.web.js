/**
 * Web stub for react-native-maps.
 * Maps are not supported in web version - shows placeholder.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Placeholder component for web
const MapView = ({ style, children, ...props }) => (
    <View style={[styles.container, style]}>
        <Text style={styles.text}>🗺️ Map is not available in web version</Text>
        <Text style={styles.subtext}>Please use the mobile app for map features</Text>
    </View>
);

const Marker = () => null;
const Callout = () => null;
const Circle = () => null;
const Polygon = () => null;
const Polyline = () => null;
const Overlay = () => null;
const Heatmap = () => null;
const Geojson = () => null;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1F2937',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#374151',
        borderStyle: 'dashed',
    },
    text: {
        fontSize: 18,
        color: '#9CA3AF',
        marginBottom: 8,
    },
    subtext: {
        fontSize: 14,
        color: '#6B7280',
    },
});

export default MapView;
export {
    Marker,
    Callout,
    Circle,
    Polygon,
    Polyline,
    Overlay,
    Heatmap,
    Geojson,
};
