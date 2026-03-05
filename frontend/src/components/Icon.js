/**
 * Icon — SVG-based icon component to replace Ionicons on web.
 * Uses react-native-svg for reliable rendering on all platforms.
 */

import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline, Polygon } from 'react-native-svg';

const icons = {
    // Navigation / General
    'home': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <Polyline points="9 22 9 12 15 12 15 22" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    ),
    'home-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <Polyline points="9 22 9 12 15 12 15 22" />
        </Svg>
    ),
    'search': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="11" cy="11" r="8" />
            <Line x1="21" y1="21" x2="16.65" y2="16.65" />
        </Svg>
    ),
    'search-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="11" cy="11" r="8" />
            <Line x1="21" y1="21" x2="16.65" y2="16.65" />
        </Svg>
    ),
    'calculator': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Rect x="4" y="2" width="16" height="20" rx="2" ry="2" fill={color} />
            <Rect x="7" y="5" width="10" height="4" rx="1" fill="white" opacity="0.9" />
            <Circle cx="8" cy="14" r="1.2" fill="white" />
            <Circle cx="12" cy="14" r="1.2" fill="white" />
            <Circle cx="16" cy="14" r="1.2" fill="white" />
            <Circle cx="8" cy="18" r="1.2" fill="white" />
            <Circle cx="12" cy="18" r="1.2" fill="white" />
            <Rect x="14.8" y="16.8" width="2.4" height="2.4" rx="1.2" fill="white" />
        </Svg>
    ),
    'calculator-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
            <Line x1="8" y1="6" x2="16" y2="6" />
            <Line x1="16" y1="12" x2="16" y2="18" />
            <Line x1="8" y1="12" x2="8" y2="12" strokeWidth="2.5" />
            <Line x1="12" y1="12" x2="12" y2="12" strokeWidth="2.5" />
            <Line x1="16" y1="12" x2="16" y2="12" strokeWidth="2.5" />
            <Line x1="8" y1="16" x2="8" y2="16" strokeWidth="2.5" />
            <Line x1="12" y1="16" x2="12" y2="16" strokeWidth="2.5" />
        </Svg>
    ),
    'bar-chart': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Rect x="18" y="3" width="4" height="18" rx="1" />
            <Rect x="11" y="8" width="4" height="13" rx="1" />
            <Rect x="4" y="13" width="4" height="8" rx="1" />
        </Svg>
    ),
    'bar-chart-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Line x1="18" y1="20" x2="18" y2="10" />
            <Line x1="12" y1="20" x2="12" y2="4" />
            <Line x1="6" y1="20" x2="6" y2="14" />
        </Svg>
    ),
    'sparkles': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
            <Path d="M19 14l.75 2.25L22 17l-2.25.75L19 20l-.75-2.25L16 17l2.25-.75L19 14z" />
            <Path d="M5 18l.5 1.5L7 20l-1.5.5L5 22l-.5-1.5L3 20l1.5-.5L5 18z" />
        </Svg>
    ),
    'sparkles-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
            <Path d="M19 14l.75 2.25L22 17l-2.25.75L19 20l-.75-2.25L16 17l2.25-.75L19 14z" />
            <Path d="M5 18l.5 1.5L7 20l-1.5.5L5 22l-.5-1.5L3 20l1.5-.5L5 18z" />
        </Svg>
    ),
    'settings-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="12" r="3" />
            <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </Svg>
    ),
    'trending-up': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <Polyline points="17 6 23 6 23 12" />
        </Svg>
    ),
    'trending-down': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
            <Polyline points="17 18 23 18 23 12" />
        </Svg>
    ),
    'chevron-forward': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="9 18 15 12 9 6" />
        </Svg>
    ),
    'chevron-back': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="15 18 9 12 15 6" />
        </Svg>
    ),
    'cart': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <Line x1="3" y1="6" x2="21" y2="6" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
            <Path d="M16 10a4 4 0 0 1-8 0" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
    ),
    'add-circle': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Circle cx="12" cy="12" r="11" />
            <Line x1="12" y1="7" x2="12" y2="17" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <Line x1="7" y1="12" x2="17" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </Svg>
    ),
    'add': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
            <Line x1="12" y1="5" x2="12" y2="19" />
            <Line x1="5" y1="12" x2="19" y2="12" />
        </Svg>
    ),
    'remove': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
            <Line x1="5" y1="12" x2="19" y2="12" />
        </Svg>
    ),
    'close-circle': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Circle cx="12" cy="12" r="11" />
            <Line x1="15" y1="9" x2="9" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <Line x1="9" y1="9" x2="15" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </Svg>
    ),
    'trash-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="3 6 5 6 21 6" />
            <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <Path d="M10 11v6" />
            <Path d="M14 11v6" />
            <Path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </Svg>
    ),
    'cube-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <Polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <Line x1="12" y1="22.08" x2="12" y2="12" />
        </Svg>
    ),
    'log-out-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <Polyline points="16 17 21 12 16 7" />
            <Line x1="21" y1="12" x2="9" y2="12" />
        </Svg>
    ),
    'pricetag': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <Circle cx="7" cy="7" r="1.5" fill="white" />
        </Svg>
    ),
    'shield': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </Svg>
    ),
    'map': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <Line x1="8" y1="2" x2="8" y2="18" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" />
            <Line x1="16" y1="6" x2="16" y2="22" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" />
        </Svg>
    ),
    'ellipse': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Circle cx="12" cy="12" r="8" />
        </Svg>
    ),
    'location-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <Circle cx="12" cy="10" r="3" />
        </Svg>
    ),
    'star': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </Svg>
    ),
    'star-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </Svg>
    ),
    'person-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <Circle cx="12" cy="7" r="4" />
        </Svg>
    ),
    'mail-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <Polyline points="22,6 12,13 2,6" />
        </Svg>
    ),
    'lock-closed-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </Svg>
    ),
    'eye-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <Circle cx="12" cy="12" r="3" />
        </Svg>
    ),
    'eye-off-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <Line x1="1" y1="1" x2="23" y2="23" />
        </Svg>
    ),
    'alert-circle-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="12" r="10" />
            <Line x1="12" y1="8" x2="12" y2="12" />
            <Line x1="12" y1="16" x2="12.01" y2="16" />
        </Svg>
    ),
    'checkmark-circle': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Circle cx="12" cy="12" r="11" />
            <Polyline points="8 12 11 15 16 9" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    ),
    'refresh-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="23 4 23 10 17 10" />
            <Polyline points="1 20 1 14 7 14" />
            <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <Path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
        </Svg>
    ),
    'send': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Line x1="22" y1="2" x2="11" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <Polygon points="22 2 15 22 11 13 2 9 22 2" />
        </Svg>
    ),
    'cash-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Rect x="2" y="6" width="20" height="12" rx="2" />
            <Circle cx="12" cy="12" r="3" />
            <Path d="M6 12h.01M18 12h.01" />
        </Svg>
    ),
    'restaurant-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <Path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <Line x1="6" y1="1" x2="6" y2="4" />
            <Line x1="10" y1="1" x2="10" y2="4" />
            <Line x1="14" y1="1" x2="14" y2="4" />
        </Svg>
    ),
    'information-circle-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="12" r="10" />
            <Line x1="12" y1="16" x2="12" y2="12" />
            <Line x1="12" y1="8" x2="12.01" y2="8" />
        </Svg>
    ),
    'notifications-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </Svg>
    ),
    'shield-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </Svg>
    ),
    'storefront-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <Rect x="9" y="13" width="6" height="8" />
        </Svg>
    ),
    'grid-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Rect x="3" y="3" width="7" height="7" />
            <Rect x="14" y="3" width="7" height="7" />
            <Rect x="14" y="14" width="7" height="7" />
            <Rect x="3" y="14" width="7" height="7" />
        </Svg>
    ),
    'list-outline': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Line x1="8" y1="6" x2="21" y2="6" />
            <Line x1="8" y1="12" x2="21" y2="12" />
            <Line x1="8" y1="18" x2="21" y2="18" />
            <Line x1="3" y1="6" x2="3.01" y2="6" />
            <Line x1="3" y1="12" x2="3.01" y2="12" />
            <Line x1="3" y1="18" x2="3.01" y2="18" />
        </Svg>
    ),
    'arrow-back': (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Line x1="19" y1="12" x2="5" y2="12" />
            <Polyline points="12 19 5 12 12 5" />
        </Svg>
    ),
};

/**
 * Usage: <Icon name="home" size={24} color="#fff" />
 */
import { View, Platform } from 'react-native';

export default function Icon({ name, size = 24, color = '#fff', style }) {
    const renderer = icons[name] || icons['ellipse'];
    const svg = renderer(color, size);
    // On web, SVG intercepts pointer events — wrap in a non-interactive View
    if (Platform.OS === 'web') {
        return (
            <View style={[{ width: size, height: size, pointerEvents: 'none' }, style]}>
                {svg}
            </View>
        );
    }
    return svg;
}
