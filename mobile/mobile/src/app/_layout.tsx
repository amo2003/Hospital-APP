import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';

// Keep the native splash screen visible while the app is loading.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if the splash screen has already been handled.
});

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    async function prepareApp() {
      try {
        // Add any startup/loading logic here later.
      } catch (error) {
        console.warn('App initialization error:', error);
      } finally {
        try {
          await SplashScreen.hideAsync();
        } catch (error) {
          console.warn('Splash screen error:', error);
        }
      }
    }

    prepareApp();
  }, []);

  return (
    <ThemeProvider
      value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <AppTabs />
    </ThemeProvider>
  );
}