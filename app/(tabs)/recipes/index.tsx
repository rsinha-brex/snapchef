import { API_BASE } from '@/lib/api';
import { View, Text, FlatList, TouchableOpacity, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { Search, X, Sparkles, SlidersHorizontal } from 'lucide-react-native';
import { colors, type as typography, spacing, radius } from '@/constants/theme';
import AccentHeader from '@/components/AccentHeader';
import RecipeCard from '@/components/RecipeCard';

const CUISINE_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Italian', value: 'italian' },
  { label: 'Mexican', value: 'mexican' },
  { label: 'Asian', value: 'asian' },
  { label: 'Indian', value: 'indian' },
  { label: 'Mediterranean', value: 'mediterranean' },
  { label: 'American', value: 'american' },
];

const TIME_FILTERS = [
  { label: 'Any time', value: 0 },
  { label: '<15 min', value: 15 },
  { label: '<30 min', value: 30 },
  { label: '<60 min', value: 60 },
];

const DIFFICULTY_FILTERS = [
  { label: 'Any', value: '' },
  { label: 'Easy', value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard', value: 'hard' },
];

const DIET_FILTERS = [
  { label: 'None', value: '' },
  { label: 'Vegetarian', value: 'vegetarian' },
  { label: 'Vegan', value: 'vegan' },
  { label: 'Gluten-free', value: 'gluten-free' },
];

export default function RecipesScreen() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const [cuisine, setCuisine] = useState('');
  const [maxTime, setMaxTime] = useState(0);
  const [difficulty, setDifficulty] = useState('');
  const [diet, setDiet] = useState('');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSearching, setAiSearching] = useState(false);
  const [aiResults, setAiResults] = useState<any[] | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      try {
        const token = await getToken();
        const resp = await fetch(`${API_BASE}/api/me/recipes/saved`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();
        setSavedIds(new Set((data.saved || []).map((s: any) => String(s.recipeId))));
      } catch {}
    })();
  }, [isSignedIn]);

  async function toggleSave(recipe: any) {
    if (!isSignedIn) return;
    const id = String(recipe.objectID || recipe.id);
    const isSaved = savedIds.has(id);
    setSavedIds(prev => {
      const next = new Set(prev);
      if (isSaved) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      const token = await getToken();
      if (isSaved) {
        await fetch(`${API_BASE}/api/me/recipes/saved?recipeId=${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(`${API_BASE}/api/me/recipes/saved`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ recipeId: id, title: recipe.title, image: recipe.image_url }),
        });
      }
    } catch (e) { console.error('Toggle save failed:', e); }
  }

  const activeFilterCount = [cuisine, maxTime, difficulty, diet].filter(v => v).length;

  useEffect(() => {
    if (!aiResults) fetchRecipes();
  }, [cuisine, maxTime, difficulty, diet]);

  async function fetchRecipes() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cuisine) params.set('cuisine', cuisine);
      if (maxTime) params.set('maxReadyTime', String(maxTime));
      if (difficulty) params.set('difficulty', difficulty);
      if (diet) params.set('diet', diet);
      params.set('number', '20');
      const response = await fetch(`${API_BASE}/api/recipes/search?${params.toString()}`);
      const data = await response.json();
      setRecipes(data.recipes || []);
      setTotalResults(data.totalResults || 0);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAiSearch(query: string) {
    if (!query.trim()) {
      setAiResults(null);
      return;
    }
    setAiSearching(true);
    try {
      const response = await fetch(API_BASE + '/api/recipes/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await response.json();
      setAiResults(data.recipes || []);
      setTotalResults(data.recipes?.length || 0);
    } catch (error) {
      console.error('AI search failed:', error);
    } finally {
      setAiSearching(false);
    }
  }

  function handleSearchInput(text: string) {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!text.trim()) {
      setAiResults(null);
      fetchRecipes();
      return;
    }
    searchTimeout.current = setTimeout(() => handleAiSearch(text), 800);
  }

  function clearFilters() {
    setCuisine('');
    setMaxTime(0);
    setDifficulty('');
    setDiet('');
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'What shall we', accent: 'cook this morning?' };
    if (hour < 17) return { text: 'What shall we', accent: 'cook today?' };
    return { text: 'What shall we', accent: 'cook tonight?' };
  }

  const displayRecipes = aiResults || recipes;

  return (
    <View style={styles.container}>
      {(loading || aiSearching) && (
        <View style={styles.topLoader}>
          <ActivityIndicator size="small" color={colors.tc600} />
          <Text style={styles.topLoaderText}>
            {aiSearching ? 'Searching with AI…' : 'Finding recipes…'}
          </Text>
        </View>
      )}

      <FlatList
        data={displayRecipes}
        keyExtractor={(item) => String(item.objectID || item.id)}
        style={styles.flatList}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <AccentHeader prefix={getGreeting().text} accent={getGreeting().accent} />

            <View style={styles.toolbar}>
              <TouchableOpacity
                style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
                onPress={() => setShowFilters(true)}
              >
                <SlidersHorizontal size={14} color={activeFilterCount > 0 ? colors.cream : colors.inkSoft} />
                <Text style={[styles.filterBtnText, activeFilterCount > 0 && styles.filterBtnTextActive]}>
                  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.searchToggle, showSearch && styles.searchToggleActive]}
                onPress={() => setShowSearch(!showSearch)}
              >
                <Sparkles size={14} color={showSearch ? colors.cream : colors.tc500} />
                <Text style={[styles.searchToggleText, showSearch && styles.searchToggleTextActive]}>AI Search</Text>
              </TouchableOpacity>

              {totalResults > 0 && (
                <Text style={styles.resultCount}>
                  {aiResults ? `${totalResults} results` : `${totalResults.toLocaleString()}`}
                </Text>
              )}
            </View>

            {showSearch && (
              <View style={styles.searchRow}>
                <View style={styles.searchInputWrap}>
                  <Sparkles size={14} color={colors.tc500} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="'quick weeknight pasta' or 'something spicy'"
                    placeholderTextColor={colors.inkMute}
                    value={searchQuery}
                    onChangeText={handleSearchInput}
                    autoFocus
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearchInput('')}>
                      <X size={14} color={colors.inkMute} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading && !aiSearching ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No recipes found — try adjusting your filters</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <RecipeCard
            recipe={{
              id: String(item.objectID || item.id),
              title: item.title,
              cuisine: item.cuisine,
              total_time_minutes: item.total_time_minutes,
              difficulty: item.difficulty,
            }}
            isSaved={savedIds.has(String(item.objectID || item.id))}
            onHeart={() => toggleSave(item)}
            onTap={() => router.push({ pathname: '/(tabs)/recipes/[id]', params: { id: String(item.objectID || item.id), recipe: JSON.stringify(item) } })}
          />
        )}
      />

      {showFilters && (
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => setShowFilters(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filters</Text>
              <View style={styles.sheetActions}>
                {activeFilterCount > 0 && (
                  <TouchableOpacity onPress={clearFilters}>
                    <Text style={styles.clearBtn}>Clear all</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowFilters(false)}>
                  <Text style={styles.doneBtn}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.filterLabel}>Cuisine</Text>
            <View style={styles.chips}>
              {CUISINE_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.label}
                  style={[styles.chip, cuisine === f.value && styles.chipActive]}
                  onPress={() => setCuisine(f.value)}
                >
                  <Text style={[styles.chipText, cuisine === f.value && styles.chipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Time</Text>
            <View style={styles.chips}>
              {TIME_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.label}
                  style={[styles.chip, maxTime === f.value && styles.chipActive]}
                  onPress={() => setMaxTime(f.value)}
                >
                  <Text style={[styles.chipText, maxTime === f.value && styles.chipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Difficulty</Text>
            <View style={styles.chips}>
              {DIFFICULTY_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.label}
                  style={[styles.chip, difficulty === f.value && styles.chipActive]}
                  onPress={() => setDifficulty(f.value)}
                >
                  <Text style={[styles.chipText, difficulty === f.value && styles.chipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Diet</Text>
            <View style={styles.chips}>
              {DIET_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.label}
                  style={[styles.chip, diet === f.value && styles.chipActive]}
                  onPress={() => setDiet(f.value)}
                >
                  <Text style={[styles.chipText, diet === f.value && styles.chipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream, paddingTop: 56, position: 'relative' as const },
  topLoader: { position: 'absolute', top: 56, left: 0, right: 0, zIndex: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8, backgroundColor: colors.tc50 },
  topLoaderText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '500', color: colors.tc700 },
  flatList: { flex: 1, zIndex: 1 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  header: { marginBottom: spacing.md },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 20, marginTop: spacing.sm, marginBottom: spacing.md },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.hairline },
  filterBtnActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterBtnText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '500', color: colors.inkSoft },
  filterBtnTextActive: { color: colors.cream },
  searchToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.tc50, borderWidth: 1, borderColor: colors.tc100 },
  searchToggleActive: { backgroundColor: colors.tc600, borderColor: colors.tc600 },
  searchToggleText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '500', color: colors.tc600 },
  searchToggleTextActive: { color: colors.cream },
  resultCount: { marginLeft: 'auto', fontFamily: 'Inter', fontSize: 11, color: colors.inkHint },
  searchRow: { marginBottom: spacing.md, paddingHorizontal: 20 },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.paper, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.tc300 },
  searchInput: { flex: 1, fontFamily: 'Inter', fontSize: 13, color: colors.ink },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { ...typography.body, color: colors.inkHint, textAlign: 'center' },
  // Filter sheet
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 100 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(42,31,23,0.3)' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, paddingBottom: 48, maxHeight: '75%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  sheetTitle: { fontFamily: 'Fraunces', fontSize: 22, fontWeight: '500', color: colors.ink },
  sheetActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  clearBtn: { fontFamily: 'Inter', fontSize: 13, color: colors.inkHint },
  doneBtn: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.tc600 },
  filterLabel: { fontFamily: 'Inter', fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: colors.inkHint, marginBottom: 8, marginTop: spacing.lg },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.hairline },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: 'Inter', fontSize: 13, color: colors.inkSoft },
  chipTextActive: { color: colors.cream },
});
