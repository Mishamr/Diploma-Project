const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Mock native-only packages for web
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web' && moduleName === 'react-native-maps') {
        // Return an empty module for react-native-maps on web
        return {
            filePath: require.resolve('./__mocks__/react-native-maps.js'),
            type: 'sourceFile',
        };
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
