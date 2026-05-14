import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '@/constants/theme';

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.tc600} />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/(tabs)/recipes" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
