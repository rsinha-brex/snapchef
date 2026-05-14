import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, ChevronLeft } from 'lucide-react-native';
import { colors, type as typography, spacing, radius } from '@/constants/theme';
import { useCounterStore } from '@/stores/counter';
import RecipeCard from '@/components/RecipeCard';
import AccentHeader from '@/components/AccentHeader';

export default function MatchScreen() {
  const router = useRouter();
  const { items } = useCounterStore();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seen, setSeen] = useState<string[]>([]);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    fetchMatches();
  }, []);

  async function fetchMatches() {
    setLoading(true);
    try {
      const ingredients = items.map(i => i.name).join(',');
      const seenParam = seen.length > 0 ? `&seen=${seen.join(',')}` : '';
      const response = await fetch(`/api/recipes/match-pantry?ingredients=${encodeURIComponent(ingredients)}${seenParam}&limit=5`);
      const data = await response.json();

      if (!data.recipes || data.recipes.length === 0) {
        setExhausted(true);
      } else {
        setMatches(data.recipes);
        setSeen(prev => [...prev, ...data.recipes.map((r: any) => r.objectID || r.id)]);
      }
    } catch (error) {
      console.error('Match failed:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleRefresh() {
    setExhausted(false);
    fetchMatches();
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <AccentHeader prefix="Finding" accent="recipes…" sub={`Matching ${items.length} ingredient${items.length !== 1 ? 's' : ''}`} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tc600} />
          <Text style={styles.loadingTitle}>Searching our collection</Text>
          <Text style={styles.loadingSubtitle}>Matching your ingredients to find the best recipes</Text>
        </View>
      </View>
    );
  }

  if (exhausted || matches.length === 0) {
    return (
      <View style={styles.exhausted}>
        <AccentHeader prefix="That's" accent="everything" sub={`You've seen all ${seen.length} matches for this counter`} />
        <View style={styles.exhaustedContent}>
          <View style={styles.exhaustedIcon}>
            <CheckCircle size={40} color={colors.sage500} />
          </View>
          <Text style={styles.exhaustedTitle}>Pick one or pivot</Text>
          <Text style={styles.exhaustedSubtitle}>Try adding another ingredient to your counter for fresh ideas.</Text>
          <View style={styles.exhaustedCtas}>
            <TouchableOpacity style={styles.primaryCta} onPress={() => router.back()}>
              <Text style={styles.primaryCtaText}>Back to my matches</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryCta} onPress={() => router.back()}>
              <Text style={styles.secondaryCtaText}>Add to my counter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/(tabs)/counter')}>
        <ChevronLeft size={18} color={colors.ink} />
        <Text style={styles.backBtnText}>Back</Text>
      </TouchableOpacity>
      <View style={styles.headerRow}>
        <AccentHeader prefix={`${matches.length} recipes`} accent="for you" sub={`Using ${items.length} of your ingredients`} />
        <TouchableOpacity style={styles.refreshIcon} onPress={handleRefresh}>
          <RefreshCw size={18} color={colors.inkSoft} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={matches}
        keyExtractor={(item) => String(item.objectID || item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <RecipeCard
            recipe={{
              id: String(item.objectID || item.id),
              title: item.title,
              cuisine: item.cuisine,
              total_time_minutes: item.total_time_minutes,
              difficulty: item.difficulty,
            }}
            matchInfo={{
              usedCount: item.usedCount || 0,
              totalCount: (item.ingredient_names || []).length,
            }}
            onTap={() => router.push({ pathname: '/(tabs)/recipes/[id]', params: { id: String(item.objectID || item.id), recipe: JSON.stringify(item) } })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream, paddingTop: 56 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  loadingTitle: { ...typography.h3, color: colors.ink, marginTop: spacing.lg, textAlign: 'center' },
  loadingSubtitle: { ...typography.body, color: colors.inkSoft, marginTop: spacing.sm, textAlign: 'center', maxWidth: 260 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  backBtnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: colors.ink },
  refreshIcon: { padding: 12, marginTop: 12, marginRight: 12 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  exhausted: { flex: 1, backgroundColor: colors.cream, paddingTop: 56 },
  exhaustedContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  exhaustedIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.creamDeep, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  exhaustedTitle: { ...typography.h2, color: colors.ink, textAlign: 'center', marginBottom: spacing.sm },
  exhaustedSubtitle: { ...typography.body, color: colors.inkSoft, textAlign: 'center', maxWidth: 260, marginBottom: spacing.xxl },
  exhaustedCtas: { width: '100%', maxWidth: 280, gap: spacing.md },
  primaryCta: { backgroundColor: colors.tc600, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  primaryCtaText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.cream },
  secondaryCta: { backgroundColor: colors.creamDeep, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  secondaryCtaText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.ink },
});
