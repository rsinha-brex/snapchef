import { API_BASE } from '@/lib/api';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Heart, Sparkles } from 'lucide-react-native';
import { colors, type as typography, spacing, radius } from '@/constants/theme';
import { MOCK_PANTRY } from '@/lib/mock-data';
import { useState, useEffect } from 'react';
import type { AdaptResponse } from '@/lib/schemas';
import { useCounterStore } from '@/stores/counter';
import { useAuth } from '@clerk/clerk-expo';

type ViewMode = 'original' | 'adapted' | 'not_viable';

export default function RecipeDetailScreen() {
  const router = useRouter();
  const { id, recipe: recipeParam } = useLocalSearchParams<{ id: string; recipe?: string }>();
  const { items: counterItems } = useCounterStore();
  const { getToken, isSignedIn } = useAuth();
  const [recipe, setRecipe] = useState<any | null>(recipeParam ? JSON.parse(recipeParam) : null);
  const [loading, setLoading] = useState(!recipeParam);
  const [viewMode, setViewMode] = useState<ViewMode>('original');
  const [adapting, setAdapting] = useState(false);
  const [adaptResult, setAdaptResult] = useState<AdaptResponse | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!recipe && id) {
      fetchRecipe();
    }
  }, [id]);

  async function fetchRecipe() {
    try {
      const response = await fetch(`${API_BASE}/api/recipes/${id}`);
      const data = await response.json();
      setRecipe(data.recipe || data);
    } catch (error) {
      console.error('Failed to fetch recipe:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tc600} />
        <Text style={{ marginTop: 12, color: colors.inkSoft }}>Loading recipe…</Text>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.centered}>
        <Text>Recipe not found</Text>
      </View>
    );
  }

  const pantryNames = new Set(MOCK_PANTRY.map(i => i.name.toLowerCase()));

  // Normalize field names (Algolia uses snake_case)
  const title = recipe.title || '';
  const cuisine = recipe.cuisine || '';
  const totalTime = recipe.total_time_minutes || recipe.totalTimeMinutes || 0;
  const difficulty = recipe.difficulty || '';
  const servings = recipe.servings || 4;
  const ingredients = recipe.ingredients || (recipe.ingredient_names || []).map((n: string) => ({ name: n }));
  const ingredientNames = recipe.ingredient_names || recipe.ingredientNames || ingredients.map((i: any) => i.name);
  const instructions = recipe.instructions || [];
  const imageUrl = recipe.image_url || recipe.imageUrl;

  async function handleAdapt() {
    setAdapting(true);
    try {
      const available = [
        ...MOCK_PANTRY.map(p => ({ name: p.name, category: p.category })),
        ...counterItems.map(i => ({ name: i.name, category: i.category })),
      ];
      const recipePayload = {
        title,
        ingredients: ingredients.map((i: any) => typeof i === 'string' ? { name: i } : i),
        instructions,
        servings,
      };
      const response = await fetch(API_BASE + '/api/recipes/adapt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe: recipePayload, available }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Adaptation failed');
      setAdaptResult(result);
      setViewMode(result.viability === 'not_viable' ? 'not_viable' : 'adapted');
    } catch (error: any) {
      console.error('Adapt error:', error);
    } finally {
      setAdapting(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {imageUrl && <Image source={{ uri: imageUrl }} style={styles.heroImage} />}

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.ink} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.body}>
          <View style={styles.meta}>
            <Text style={styles.cuisine}>{cuisine}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.time}>{totalTime} min</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.difficulty}>{difficulty}</Text>
            {servings && (
              <>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.servings}>{servings} servings</Text>
              </>
            )}
          </View>

          <Text style={styles.title}>{title}</Text>

          {viewMode === 'adapted' && adaptResult && (
            <View>
              <View style={styles.segmented}>
                <TouchableOpacity
                  style={[styles.segOption, viewMode !== 'adapted' && styles.segOptionActive]}
                  onPress={() => setViewMode('original')}
                >
                  <Text style={[styles.segText, viewMode !== 'adapted' && styles.segTextActive]}>Original</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.segOption, styles.segOptionActive]}>
                  <Text style={[styles.segText, styles.segTextActive]}>Your version</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.adaptCard}>
                <View style={styles.adaptCardHead}>
                  <View style={styles.sparkleCircle}>
                    <Sparkles size={12} color={colors.cream} />
                  </View>
                  <Text style={styles.adaptCardLabel}>Adapted for you</Text>
                  <View style={styles.viabilityChip}>
                    <Text style={styles.viabilityChipText}>
                      {adaptResult.viability === 'good' ? 'Still great' : adaptResult.viability === 'compromised' ? 'Compromised' : 'Stretch'}
                    </Text>
                  </View>
                </View>
                {adaptResult.adaptations.map((a, i) => (
                  <View key={i} style={styles.adaptChange}>
                    <Text style={styles.adaptChangeIcon}>
                      {a.type === 'substitute' ? '↔' : a.type === 'omit' ? '⊝' : '→'}
                    </Text>
                    <Text style={styles.adaptChangeText}>
                      <Text style={{ fontWeight: '500', color: colors.ink }}>{a.target}</Text>
                      {a.type === 'substitute' && <Text> → <Text style={{ color: colors.tc700, fontStyle: 'italic' }}>{a.replacement}</Text></Text>}
                      {a.type === 'omit' && <Text style={{ color: colors.inkSoft }}> (omitted)</Text>}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {viewMode === 'not_viable' && adaptResult && (
            <View style={styles.notViableCard}>
              <View style={styles.adaptCardHead}>
                <Text style={styles.notViableLabel}>⊘ Honest take</Text>
              </View>
              <Text style={styles.notViableText}>{adaptResult.reason}</Text>
              <Text style={styles.notViableSuggestion}>Want me to find something similar you could make tonight?</Text>
              <View style={styles.notViableCtas}>
                <TouchableOpacity style={styles.notViablePrimary}>
                  <Text style={styles.notViablePrimaryText}>Find similar recipes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.notViableSecondary}>
                  <Text style={styles.notViableSecondaryText}>Save for later</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.notViableGhost} onPress={() => setViewMode('original')}>
                  <Text style={styles.notViableGhostText}>View original anyway</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {(viewMode === 'adapted' && adaptResult?.adapted?.ingredients
              ? adaptResult.adapted.ingredients
              : ingredients
            ).map((ing: any, i: number) => {
              const name = typeof ing === 'string' ? ing : ing.name;
              const inPantry = pantryNames.has((name || '').toLowerCase());
              return (
                <View key={i} style={styles.ingredientRow}>
                  <Text style={[styles.checkmark, inPantry && styles.checkmarkHave]}>
                    {inPantry ? '✓' : '○'}
                  </Text>
                  <Text style={styles.ingredientText}>
                    {typeof ing === 'string' ? ing : `${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`.trim()}
                  </Text>
                  {inPantry && <Text style={styles.inPantryTag}>in pantry</Text>}
                </View>
              );
            })}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            {(() => {
              const steps = viewMode === 'adapted' && adaptResult?.adapted?.instructions
                ? adaptResult.adapted.instructions
                : instructions;
              if (steps.length > 0) {
                return steps.map((step: string, i: number) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={styles.stepNum}>
                      <Text style={styles.stepNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ));
              }
              return (
                <Text style={styles.noInstructions}>
                  Instructions not available for this recipe. Tap "Make it with what I have" to get a full adapted version with steps.
                </Text>
              );
            })()}
          </View>
        </View>
      </ScrollView>

      {viewMode === 'original' && (
        <View style={styles.ctaBar}>
          <TouchableOpacity
            style={[styles.adaptBtn, adapting && styles.adaptBtnDisabled]}
            onPress={handleAdapt}
            disabled={adapting}
          >
            {adapting && <ActivityIndicator size="small" color={colors.cream} style={{ marginRight: 8 }} />}
            <Text style={styles.adaptBtnText}>
              {adapting ? 'Adapting to your pantry…' : 'Make it with what I have'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {viewMode === 'adapted' && (
        <View style={styles.ctaBar}>
          <TouchableOpacity style={styles.toggleBtn} onPress={() => setViewMode('original')}>
            <Text style={styles.toggleBtnText}>View original</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveAdaptBtn}>
            <Text style={styles.saveAdaptBtnText}>Save this version</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 120 },
  heroImage: { width: '100%', height: 240 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  backBtnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: colors.ink },
  body: { padding: spacing.xl, paddingTop: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  cuisine: { ...typography.cap, color: colors.tc600 },
  dot: { color: colors.inkMute, fontSize: 10 },
  time: { ...typography.bodySm, color: colors.inkHint },
  difficulty: { ...typography.bodySm, color: colors.inkHint },
  servings: { ...typography.bodySm, color: colors.inkHint },
  title: { ...typography.h1, color: colors.ink, marginBottom: spacing.lg },
  adaptedBanner: {},
  adaptedBannerText: {},
  viabilityText: {},
  adaptationItem: {},
  notViableBanner: {},
  notViableTitle: {},
  notViableText: { ...typography.body, color: colors.inkSoft, lineHeight: 20, marginBottom: spacing.md },
  pickAnotherBtn: {},
  pickAnotherText: {},
  // Segmented toggle
  segmented: { flexDirection: 'row', backgroundColor: colors.creamDeep, borderRadius: radius.pill, padding: 3, marginBottom: 16 },
  segOption: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.pill },
  segOptionActive: { backgroundColor: colors.paper },
  segText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: colors.inkHint },
  segTextActive: { color: colors.tc700 },
  // Adapt card
  adaptCard: { borderRadius: radius.lg, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.tc100, backgroundColor: colors.tc50 },
  adaptCardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sparkleCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.tc600, alignItems: 'center', justifyContent: 'center' },
  adaptCardLabel: { fontFamily: 'Fraunces', fontSize: 14, fontWeight: '500', fontStyle: 'italic', color: colors.ink },
  viabilityChip: { marginLeft: 'auto', backgroundColor: colors.paper, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  viabilityChipText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '600', color: colors.tc700 },
  adaptChange: { flexDirection: 'row', gap: 6, paddingVertical: 5 },
  adaptChangeIcon: { fontSize: 11, color: colors.tc600, marginTop: 2 },
  adaptChangeText: { fontFamily: 'Inter', fontSize: 12, color: colors.inkSoft, flex: 1 },
  // Not viable card
  notViableCard: { borderRadius: radius.lg, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.saffron400, backgroundColor: colors.saffron100 },
  notViableLabel: { fontFamily: 'Fraunces', fontSize: 14, fontWeight: '500', color: colors.saffron600 },
  notViableSuggestion: { fontFamily: 'Fraunces', fontSize: 13, fontStyle: 'italic', color: colors.inkSoft, marginBottom: spacing.lg },
  notViableCtas: { gap: spacing.sm },
  notViablePrimary: { backgroundColor: colors.tc600, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  notViablePrimaryText: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: colors.cream },
  notViableSecondary: { backgroundColor: colors.creamDeep, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  notViableSecondaryText: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: colors.ink },
  notViableGhost: { borderWidth: 1, borderColor: colors.hairlineStrong, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  notViableGhostText: { fontFamily: 'Inter', fontSize: 13, fontWeight: '500', color: colors.inkSoft },
  section: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.h3, color: colors.ink, marginBottom: spacing.md },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm },
  checkmark: { fontSize: 16, color: colors.inkMute, width: 20 },
  checkmarkHave: { color: colors.sage500 },
  ingredientText: { ...typography.body, color: colors.ink, flex: 1 },
  inPantryTag: { ...typography.bodySm, color: colors.sage500, fontWeight: '500' },
  stepRow: { flexDirection: 'row', marginBottom: spacing.lg, gap: spacing.md },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.tc600, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 13, fontWeight: '600', color: colors.cream },
  stepText: { ...typography.body, color: colors.ink, flex: 1, lineHeight: 22 },
  noInstructions: { ...typography.body, color: colors.inkHint, fontStyle: 'italic', lineHeight: 20 },
  ctaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: spacing.md, padding: spacing.lg, paddingBottom: 44, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.hairline },
  adaptBtn: { flex: 1, flexDirection: 'row', backgroundColor: colors.tc600, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  adaptBtnDisabled: { opacity: 0.6 },
  adaptBtnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.cream },
  toggleBtn: { flex: 1, backgroundColor: colors.creamDeep, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  toggleBtnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.inkSoft },
  saveAdaptBtn: { flex: 1, backgroundColor: colors.tc600, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  saveAdaptBtnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.cream },
});
