import { API_BASE } from '@/lib/api';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
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
  const [exactOnly, setExactOnly] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;

  useEffect(() => {
    fetchMatches();
  }, []);

  async function fetchMatches() {
    setLoading(true);
    try {
      const ingredients = items.map(i => i.name).join(',');
      const response = await fetch(`${API_BASE}/api/recipes/match-pantry?ingredients=${encodeURIComponent(ingredients)}&limit=20`);
      const data = await response.json();
      setAllMatches(data.recipes || []);
    } catch (error) {
      console.error('Match failed:', error);
    } finally {
      setLoading(false);
    }
  }

  const filtered = exactOnly
    ? allMatches.filter(r => r.missedCount <= 2)
    : allMatches;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const displayMatches = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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
        <AccentHeader prefix={`${filtered.length} recipes`} accent="for you" sub={`Using ${items.length} of your ingredients`} />
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, !exactOnly && styles.toggleBtnActive]}
          onPress={() => { setExactOnly(false); setPage(0); }}
        >
          <Text style={[styles.toggleText, !exactOnly && styles.toggleTextActive]}>Best matches</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, exactOnly && styles.toggleBtnActive]}
          onPress={() => { setExactOnly(true); setPage(0); }}
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

      <FlatList
        data={displayMatches}
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

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
            onPress={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <Text style={[styles.pageBtnText, page === 0 && styles.pageBtnTextDisabled]}>← Previous</Text>
          </TouchableOpacity>
          <Text style={styles.pageIndicator}>{page + 1} / {totalPages}</Text>
          <TouchableOpacity
            style={[styles.pageBtn, page >= totalPages - 1 && styles.pageBtnDisabled]}
            onPress={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            <Text style={[styles.pageBtnText, page >= totalPages - 1 && styles.pageBtnTextDisabled]}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  pagination: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: 44, backgroundColor: colors.cream, borderTopWidth: 1, borderTopColor: colors.hairline },
  pageBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  pageBtnDisabled: { opacity: 0.3 },
  pageBtnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.tc600 },
  pageBtnTextDisabled: { color: colors.inkMute },
  pageIndicator: { fontFamily: 'Inter', fontSize: 13, color: colors.inkHint },
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
