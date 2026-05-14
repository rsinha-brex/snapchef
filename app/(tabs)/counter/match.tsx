import { API_BASE } from '@/lib/api';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react-native';
import { colors, type as typography, spacing, radius } from '@/constants/theme';
import { useCounterStore } from '@/stores/counter';
import RecipeCard from '@/components/RecipeCard';
import AccentHeader from '@/components/AccentHeader';

export default function MatchScreen() {
  const router = useRouter();
  const { items } = useCounterStore();
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exactOnly, setExactOnly] = useState(false);
  const [visible, setVisible] = useState(10);
  const [seen, setSeen] = useState<string[]>([]);
  const BATCH = 10;

  useEffect(() => {
    fetchMatches(true);
  }, []);

  async function fetchMatches(initial = false) {
    if (initial) setLoading(true);
    else setLoadingMore(true);
    try {
      const ingredients = items.map(i => i.name).join(',');
      const seenParam = !initial && seen.length > 0 ? `&seen=${seen.join(',')}` : '';
      const response = await fetch(`${API_BASE}/api/recipes/match-pantry?ingredients=${encodeURIComponent(ingredients)}&limit=20${seenParam}`);
      const data = await response.json();
      const newRecipes = data.recipes || [];
      setAllMatches(prev => initial ? newRecipes : [...prev, ...newRecipes]);
      setSeen(prev => [...prev, ...newRecipes.map((r: any) => String(r.objectID || r.id))]);
    } catch (error) {
      console.error('Match failed:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function handleShowMore() {
    const nextVisible = visible + BATCH;
    setVisible(nextVisible);
    if (nextVisible > allMatches.length) {
      await fetchMatches(false);
    }
  }

  const filtered = exactOnly
    ? allMatches.filter(r => r.missedCount <= 2)
    : allMatches;

  const displayMatches = filtered.slice(0, visible);
  const hasMore = visible < filtered.length || !loading;

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

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/(tabs)/counter')}>
        <ChevronLeft size={18} color={colors.ink} />
        <Text style={styles.backBtnText}>Back</Text>
      </TouchableOpacity>
      <View style={styles.headerRow}>
        <AccentHeader prefix="Recipes" accent="for you" sub={`Using ${items.length} of your ingredients`} />
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, !exactOnly && styles.toggleBtnActive]}
          onPress={() => { setExactOnly(false); setVisible(10); }}
        >
          <Text style={[styles.toggleText, !exactOnly && styles.toggleTextActive]}>Best matches</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, exactOnly && styles.toggleBtnActive]}
          onPress={() => { setExactOnly(true); setVisible(10); }}
        >
          <Text style={[styles.toggleText, exactOnly && styles.toggleTextActive]}>Can make now</Text>
        </TouchableOpacity>
      </View>

      {filtered.length === 0 && (
        <View style={styles.noExact}>
          <Text style={styles.noExactText}>
            {exactOnly
              ? 'No recipes you can make with just these ingredients. Try "Best matches" or add more items.'
              : 'No matches found. Try adding more ingredients.'}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {displayMatches.map(item => (
          <RecipeCard
            key={String(item.objectID || item.id)}
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
        ))}
        {displayMatches.length > 0 && (
          <TouchableOpacity style={styles.showMoreBtn} onPress={handleShowMore} disabled={loadingMore}>
            <Text style={styles.showMoreText}>
              {loadingMore ? 'Loading…' : 'Show more'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
  toggleRow: { flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: colors.creamDeep, borderRadius: radius.pill, padding: 3 },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.pill },
  toggleBtnActive: { backgroundColor: colors.paper },
  toggleText: { fontFamily: 'Inter', fontSize: 13, fontWeight: '500', color: colors.inkHint },
  toggleTextActive: { color: colors.tc700, fontWeight: '600' },
  noExact: { padding: spacing.xl, alignItems: 'center' },
  noExactText: { ...typography.body, color: colors.inkSoft, textAlign: 'center', lineHeight: 20 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  showMoreBtn: { backgroundColor: colors.creamDeep, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.xl },
  showMoreText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.inkSoft },
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
