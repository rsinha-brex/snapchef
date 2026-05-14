import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';
import { colors, type as typography, spacing, radius } from '@/constants/theme';

type MatchInfo = {
  usedCount: number;
  totalCount: number;
  missedFirst?: string;
};

type Props = {
  recipe: { id: string; title: string; cuisine?: string; total_time_minutes?: number; difficulty?: string };
  matchInfo?: MatchInfo;
  isSaved?: boolean;
  onTap: () => void;
  onHeart?: () => void;
};

export default function RecipeCard({ recipe, matchInfo, isSaved, onTap, onHeart }: Props) {
  const isPerfect = matchInfo && matchInfo.usedCount === matchInfo.totalCount;

  return (
    <TouchableOpacity style={styles.card} onPress={onTap} activeOpacity={0.8}>
      <View style={styles.topRow}>
        {matchInfo && (
          <View style={[styles.matchBadge, isPerfect && styles.matchBadgePerfect]}>
            <Text style={[styles.matchBadgeText, isPerfect && styles.matchBadgeTextPerfect]}>
              {isPerfect ? `All ${matchInfo.totalCount} ingredients` : `${matchInfo.usedCount} of ${matchInfo.totalCount}`}
            </Text>
          </View>
        )}
        <TouchableOpacity style={styles.heartBtn} onPress={onHeart}>
          <Heart size={16} color={colors.tc600} fill={isSaved ? colors.tc600 : 'none'} />
        </TouchableOpacity>
      </View>

      <Text style={styles.title} numberOfLines={2}>{recipe.title}</Text>
      <View style={styles.meta}>
        {recipe.cuisine && <Text style={styles.metaText}>{recipe.cuisine}</Text>}
        {recipe.cuisine && recipe.total_time_minutes && <View style={styles.dot} />}
        {recipe.total_time_minutes && <Text style={styles.metaText}>{recipe.total_time_minutes} min</Text>}
        {recipe.difficulty && <><View style={styles.dot} /><Text style={styles.metaText}>{recipe.difficulty}</Text></>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.paper, borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.hairline },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  matchBadge: { backgroundColor: colors.paper, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.sage300 },
  matchBadgePerfect: { backgroundColor: colors.sage500, borderColor: colors.sage500 },
  matchBadgeText: { fontFamily: 'Inter', fontSize: 10, fontWeight: '600', color: colors.sage700, letterSpacing: 0.2 },
  matchBadgeTextPerfect: { color: colors.paper },
  heartBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Fraunces', fontSize: 18, fontWeight: '500', lineHeight: 22, color: colors.ink, marginBottom: 6, letterSpacing: -0.2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: 'Inter', fontSize: 11, color: colors.inkHint },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.inkHint, opacity: 0.5 },
});
