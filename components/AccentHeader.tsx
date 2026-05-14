import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

type Props = {
  prefix: string;
  accent: string;
  sub?: string;
};

export default function AccentHeader({ prefix, accent, sub }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        {prefix} <Text style={styles.accent}>{accent}</Text>
      </Text>
      {sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  heading: { fontFamily: 'Fraunces', fontSize: 28, fontWeight: '400', color: colors.ink, letterSpacing: -0.3 },
  accent: { fontStyle: 'italic', fontWeight: '300', color: colors.tc600 },
  sub: { fontFamily: 'Inter', fontSize: 12, color: colors.inkHint, marginTop: 2 },
});
