import { Stack } from 'expo-router';
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/constants/theme';
import { View, ActivityIndicator, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Fraunces_400Regular, Fraunces_500Medium, Fraunces_300Light_Italic, Fraunces_400Regular_Italic } from '@expo-google-fonts/fraunces';

const queryClient = new QueryClient();
const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

const tokenCache = Platform.OS !== 'web' ? {
  async getToken(key: string) {
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
  },
  async saveToken(key: string, value: string) {
    try { await SecureStore.setItemAsync(key, value); } catch {}
  },
} : undefined;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Inter': Inter_400Regular,
    'Inter_500': Inter_500Medium,
    'Inter_600': Inter_600SemiBold,
    'Fraunces': Fraunces_400Regular,
    'Fraunces_500': Fraunces_500Medium,
    'Fraunces_300_Italic': Fraunces_300Light_Italic,
    'Fraunces_Italic': Fraunces_400Regular_Italic,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.tc600} />
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
      <ClerkLoaded>
        <QueryClientProvider client={queryClient}>
          <View style={{ flex: 1, backgroundColor: colors.cream }}>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </View>
        </QueryClientProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
