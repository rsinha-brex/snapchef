import { View, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

export default function SSOCallback() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.tc600} />
    </View>
  );
}
