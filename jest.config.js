/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo/web',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.{ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-gifted-charts|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|@supabase/.*|zustand|date-fns)',
  ],
  moduleNameMapper: {
    '^expo-router$': '<rootDir>/src/__tests__/__mocks__/expo-router.ts',
    '^expo-font$': '<rootDir>/src/__tests__/__mocks__/expo-font.ts',
    '^expo-secure-store$': '<rootDir>/src/__tests__/__mocks__/expo-secure-store.ts',
    '^expo-linking$': '<rootDir>/src/__tests__/__mocks__/expo-linking.ts',
    '^expo-constants$': '<rootDir>/src/__tests__/__mocks__/expo-constants.ts',
    '^expo-splash-screen$': '<rootDir>/src/__tests__/__mocks__/expo-splash-screen.ts',
    '^expo-image-picker$': '<rootDir>/src/__tests__/__mocks__/expo-image-picker.ts',
    '^expo-notifications$': '<rootDir>/src/__tests__/__mocks__/expo-notifications.ts',
    '^expo-linear-gradient$': '<rootDir>/src/__tests__/__mocks__/expo-linear-gradient.ts',
    '\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/src/__tests__/__mocks__/asset.ts',
    '^react-native-safe-area-context$': '<rootDir>/src/__tests__/__mocks__/react-native-safe-area-context.ts',
  },
};
