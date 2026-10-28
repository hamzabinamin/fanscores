import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppFilterProvider } from '../context/AppFilterContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useAppTheme } from '../context/ThemeContext';

function RootStack() {
  const { theme } = useAppTheme();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // configure how notifications display while the app is foregrounded
  useEffect(() => {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    } catch (e) {
      console.warn('Notification handler setup failed:', e);
    }
  }, []);

  // deep-link: tapping a notification opens the match screen
  useEffect(() => {
    let sub: Notifications.Subscription | undefined;
    try {
      // cold start: app opened by tapping a notification
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          const gameId = response?.notification.request.content.data?.gameId;
          if (gameId) router.push(`/match/${gameId}`);
        })
        .catch(() => {});

      // warm: app already running when the notification is tapped
      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const gameId = response.notification.request.content.data?.gameId;
        if (gameId) router.push(`/match/${gameId}`);
      });
    } catch (e) {
      console.warn('Notification listener setup failed:', e);
    }
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  return (
    <>
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
          <AppFilterProvider>
            <RootStack />
          </AppFilterProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}