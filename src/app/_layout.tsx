import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useAppTheme } from '../context/ThemeContext';

function RootStack() {
  const { theme } = useAppTheme();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Wait for Firebase to finish initializing

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // User is not signed in and is not in the (auth) group
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // User is signed in and trying to access (auth)
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  return (
    <>
      {/* Dynamic Status Bar matching the current top-bar depth */}
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <RootStack />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}