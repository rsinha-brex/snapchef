import { API_BASE } from '@/lib/api';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, type as typography, spacing, radius } from '@/constants/theme';
import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import AccentHeader from '@/components/AccentHeader';

type SubTab = 'recipes' | 'adaptations';

export default function SavedScreen() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<SubTab>('recipes');
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [savedAdaptations, setSavedAdaptations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!isSignedIn) { setLoading(false); return; }
      let cancelled = false;
      (async () => {
        try {
          const token = await getToken();
          const [recipesResp, adaptationsResp] = await Promise.all([
            fetch(`${API_BASE}/api/me/recipes/saved`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/me/adaptations`, { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          const recipesData = await recipesResp.json();
          const adaptationsData = await adaptationsResp.json();
          if (!cancelled) {
            setSavedRecipes(recipesData.saved || []);
            setSavedAdaptations(adaptationsData.adaptations || []);
          }
        } catch (e) {
          console.error('Failed to load saved:', e);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [isSignedIn])
  );

  return (
    <View style={styles.container}>
      <AccentHeader
        prefix="Your"
        accent="saved"
        sub={`${savedRecipes.length} recipes · ${savedAdaptations.length} versions`}
      />

      <View style={styles.segmented}>
        <TouchableOpacity
          style={[styles.segOption, activeTab === 'recipes' && styles.segOptionActive]}
          onPress={() => setActiveTab('recipes')}
        >
          <Text style={[styles.segText, activeTab === 'recipes' && styles.segTextActive]}>Recipes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segOption, activeTab === 'adaptations' && styles.segOptionActive]}
          onPress={() => setActiveTab('adaptations')}
        >
          <Text style={[styles.segText, activeTab === 'adaptations' && styles.segTextActive]}>Your versions</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'recipes' && (
        <FlatList
          data={savedRecipes}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/(tabs)/recipes/[id]', params: { id: String(item.recipeId) } })}
            >
              {item.recipeImage && <Image source={{ uri: item.recipeImage }} style={styles.cardThumb} />}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.recipeTitle}</Text>
                <Text style={styles.cardMeta}>
                  Saved {new Date(item.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No saved recipes yet</Text>
              <Text style={styles.emptySubtitle}>Tap the heart on any recipe to save it</Text>
            </View>
          }
        />
      )}

      {activeTab === 'adaptations' && (
        <FlatList
          data={savedAdaptations}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                const adapted = item.adaptedPayload?.adapted || item.adaptedPayload;
                const recipeForDetail = {
                  objectID: String(item.recipeId),
                  id: String(item.recipeId),
                  title: item.recipeTitle,
                  cuisine: adapted?.cuisine || 'AI',
                  total_time_minutes: adapted?.total_time_minutes || 30,
                  difficulty: adapted?.difficulty || 'medium',
                  servings: adapted?.servings || 4,
                  ingredients: adapted?.ingredients || [],
                  ingredient_names: adapted?.ingredient_names || (adapted?.ingredients || []).map((i: any) => i.name),
                  instructions: adapted?.instructions || [],
                };
                router.push({ pathname: '/(tabs)/recipes/[id]', params: { id: String(item.recipeId), recipe: JSON.stringify(recipeForDetail), from: 'saved' } });
              }}
            >
              {item.recipeImage && <Image source={{ uri: item.recipeImage }} style={styles.cardThumb} />}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.recipeTitle}</Text>
                <Text style={styles.cardMeta}>
                  Adapted · {new Date(item.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No adaptations saved</Text>
              <Text style={styles.emptySubtitle}>When you "Make it with what I have" or open a Chef Claude recipe, it saves here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream, paddingTop: 56 },
  segmented: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: colors.creamDeep, borderRadius: radius.pill, padding: 3, marginBottom: 12, marginTop: 12 },
  segOption: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.pill },
  segOptionActive: { backgroundColor: colors.paper },
  segText: { fontFamily: 'Inter', fontSize: 13, fontWeight: '500', color: colors.inkHint },
  segTextActive: { color: colors.tc700, fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingBottom: 48 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.paper, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline, marginBottom: 8 },
  cardThumb: { width: 54, height: 54, borderRadius: 10 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardTitle: { fontFamily: 'Fraunces', fontSize: 15, fontWeight: '500', color: colors.ink, marginBottom: 3 },
  cardMeta: { fontFamily: 'Inter', fontSize: 12, color: colors.inkHint },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { ...typography.h3, color: colors.ink, marginBottom: spacing.sm },
  emptySubtitle: { ...typography.body, color: colors.inkSoft, textAlign: 'center' },
});
