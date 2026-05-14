import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useRef, useEffect } from 'react';
import { Check } from 'lucide-react-native';
import { colors } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
};

export default function LoadingSpinner({ title, subtitle }: Props) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      <View style={styles.spinnerWrap}>
        <Animated.View style={[styles.ring, { transform: [{ rotate: spin }] }]} />
        <View style={styles.iconCircle}>
          <Check size={28} color={colors.tc600} />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 16 },
  spinnerWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: colors.tc600, borderTopColor: 'transparent' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.creamDeep, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Fraunces', fontSize: 20, fontWeight: '400', color: colors.ink, textAlign: 'center' },
  subtitle: { fontFamily: 'Inter', fontSize: 13, color: colors.inkSoft, textAlign: 'center', maxWidth: 220 },
});
