import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

export default function SSOCallback() {
  const { signIn, setActive } = useSignIn();
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      if (!signIn) return;
      try {
        const result = await signIn.reload();
        if (result?.status === 'complete' && result.createdSessionId) {
          await setActive!({ session: result.createdSessionId });
          router.replace('/(tabs)/recipes');
        }
      } catch (e) {
        console.error('SSO callback error:', e);
        router.replace('/(auth)/sign-in');
      }
    }
    handleCallback();
  }, [signIn]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.tc600} />
    </View>
  );
}
