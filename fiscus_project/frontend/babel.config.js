/**
 * Babel configuration for Fiscus React Native App.
 * Configured for Expo SDK 51.
 */
module.exports = function (api) {
    api.cache(true);

    return {
        presets: ['babel-preset-expo'],
        plugins: [
            [
                'module-resolver',
                {
                    alias: {
                        'react-native-maps': './src/stubs/react-native-maps.web.js',
                    },
                    extensions: ['.web.js', '.js', '.jsx', '.ts', '.tsx'],
                },
            ],
        ],
    };
};
