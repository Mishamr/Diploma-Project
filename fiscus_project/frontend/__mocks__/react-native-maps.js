import React from 'react';
import { View, Text } from 'react-native';

const MapView = ({ children, style, ...props }) => (
    <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0' }]} {...props}>
        <Text>Map cannot be displayed on the web.</Text>
        {children}
    </View>
);

export const Marker = ({ title, description }) => (
    <View style={{ padding: 5, backgroundColor: 'red', borderRadius: 10 }}>
        <Text style={{ fontSize: 10, color: 'white' }}>{title}</Text>
    </View>
);

export const PROVIDER_GOOGLE = 'google';

export default MapView;
