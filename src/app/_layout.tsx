import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Colors } from '../constants/theme';
import { AuthProvider } from '../lib/auth';
import { supabase } from '../lib/supabase';

// Prevent splash from auto-hiding
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const MAX_APP_WIDTH = 430;
const OUTER_BG = '#EDE7F6'; // soft lavender for desktop sides

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = width >= MAX_APP_WIDTH;

  useEffect(() => {
    async function init() {
      try {
        await Font.loadAsync({
          PressStart2P: require('../../assets/fonts/PressStart2P.ttf'),
          Silkscreen: require('../../assets/fonts/Silkscreen.ttf'),
        });

        // Verify Supabase connection
        const { error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase session check:', error.message);
        } else {
          console.log('✅ Supabase connected');
        }
      } catch (e) {
        console.warn('Init error:', e);
      } finally {
        setFontsLoaded(true);
        await SplashScreen.hideAsync();
      }
    }

    init();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <View
          style={[
            styles.outer,
            isDesktop && { backgroundColor: OUTER_BG },
          ]}
        >
          <View
            style={[
              styles.container,
              isDesktop && styles.containerDesktop,
            ]}
          >
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </View>
        </View>
      </QueryClientProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.background,
  },
  containerDesktop: {
    maxWidth: MAX_APP_WIDTH,
    // Subtle shadow on desktop to frame the app
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
});
