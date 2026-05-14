import { API_BASE } from '@/lib/api';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { colors, type as typography, spacing, radius } from '@/constants/theme';
import { useCounterStore } from '@/stores/counter';
import RecipeCard from '@/components/RecipeCard';
import AccentHeader from '@/components/AccentHeader';

export default function MatchScreen() {
  const router = useRouter();
  const { items } = useCounterStore();
  const { getToken, isSignedIn } = useAuth();
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [claudeRecipes, setClaudeRecipes] = useState<any[]>([]);
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [generating, setGenerating] = useState(false);
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

  async function generateClaudeRecipes() {
    if (generating) return;
    setGenerating(true);
    try {
      const ingredients = items.map(i => i.name);
      const response = await fetch(`${API_BASE}/api/recipes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, excludeTitles: generatedTitles }),
      });
      const data = await response.json();
      if (data.recipes) {
        setClaudeRecipes(prev => [...prev, ...data.recipes]);
        setGeneratedTitles(prev => [...prev, ...data.recipes.map((r: any) => r.title)]);

        if (isSignedIn) {
          try {
            const token = await getToken();
            for (const r of data.recipes) {
              await fetch(`${API_BASE}/api/me/adaptations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  recipeId: Math.floor(Math.random() * 1000000000),
                  recipeTitle: 'Chef Claude: ' + r.title,
                  adaptedPayload: { adapted: r, viability: 'good', adaptations: [], isClaudeGenerated: true },
                }),
              });
            }
          } catch (e) { console.error('Failed to save Claude recipes:', e); }
        }
      }
    } catch (e) { console.error('Generate failed:', e); }
    finally { setGenerating(false); }
  }

  async function handleShowMore() {
    if (exactOnly) {
      await generateClaudeRecipes();
      setVisible(v => v + BATCH);
      return;
    }
    const nextVisible = visible + BATCH;
    setVisible(nextVisible);
    if (nextVisible > allMatches.length) {
      await fetchMatches(false);
    }
  }

  const exactMatches = allMatches.filter(r => r.missedCount <= 2);
  const filtered = exactOnly ? [...exactMatches, ...claudeRecipes] : allMatches;
  const displayMatches = filtered.slice(0, visible);

  // Auto-generate Claude recipes when "Can make now" has fewer than 5
  useEffect(() => {
    if (exactOnly && !loading && exactMatches.length + claudeRecipes.length < 5 && !generating && items.length > 0) {
      generateClaudeRecipes();
    }
  }, [exactOnly, loading, exactMatches.length, claudeRecipes.length]);

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

      {filtered.length === 0 && !generating && (
        <View style={styles.noExact}>
          <Text style={styles.noExactText}>
            {exactOnly
              ? 'No matching recipes yet. Chef Claude is cooking up some ideas…'
              : 'No matches found. Try adding more ingredients.'}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {displayMatches.map(item => (
          <View key={String(item.objectID || item.id)}>
            {item.isClaudeGenerated && (
              <View style={styles.claudeBadge}>
                <Sparkles size={12} color={colors.tc600} />
                <Text style={styles.claudeBadgeText}>Chef Claude</Text>
              </View>
            )}
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
              onTap={() => router.push({ pathname: '/(tabs)/recipes/[id]', params: { id: String(item.objectID || item.id), recipe: JSON.stringify(item), from: 'match' } })}
            />
          </View>
        ))}
        {displayMatches.length > 0 && (
          <TouchableOpacity
            style={exactOnly ? styles.claudeMoreBtn : styles.showMoreBtn}
            onPress={handleShowMore}
            disabled={loadingMore || generating}
          >
            {exactOnly && <Sparkles size={14} color={colors.tc600} />}
            <Text style={exactOnly ? styles.claudeMoreText : styles.showMoreText}>
              {generating ? 'Chef Claude is cooking…' : loadingMore ? 'Loading…' : exactOnly ? 'Get more Chef Claude recipes' : 'Show more'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {generating && (
        <View style={styles.cookingOverlay}>
          <View style={styles.cookingCard}>
            <ActivityIndicator size="large" color={colors.tc600} />
            <Text style={styles.cookingTitle}>Chef Claude is cooking…</Text>
            <Text style={styles.cookingSubtitle}>Generating fresh recipes using only your ingredients</Text>
          </View>
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  showMoreBtn: { backgroundColor: colors.creamDeep, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.xl },
  showMoreText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.inkSoft },
  claudeMoreBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: colors.tc50, borderRadius: radius.pill, paddingVertical: 14, marginTop: spacing.md, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.tc100 },
  claudeMoreText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.tc600 },
  claudeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.tc50, borderRadius: radius.pill, alignSelf: 'flex-start', marginBottom: 4, marginLeft: 4, borderWidth: 1, borderColor: colors.tc100 },
  claudeBadgeText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '600', color: colors.tc600 },
  cookingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(42,31,23,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  cookingCard: { backgroundColor: colors.paper, borderRadius: radius.lg, padding: spacing.xxl, alignItems: 'center', maxWidth: 300, gap: spacing.md },
  cookingTitle: { ...typography.h3, color: colors.ink, textAlign: 'center' },
  cookingSubtitle: { ...typography.body, color: colors.inkSoft, textAlign: 'center', lineHeight: 20 },
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
