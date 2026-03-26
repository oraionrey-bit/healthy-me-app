import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import { AuthProvider } from '../lib/auth';
import { supabase } from '../lib/supabase';

// Prevent splash from auto-hiding
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

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
        <View style={styles.container}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </View>
      </QueryClientProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
