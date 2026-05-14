import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, type as typography, spacing, radius } from '@/constants/theme';
import { mockSavedRecipes, mockSavedAdaptations } from '@/lib/stubs';
import { useState } from 'react';
import AccentHeader from '@/components/AccentHeader';

type SubTab = 'recipes' | 'adaptations';
type Filter = 'all' | 'want_to_try' | 'cooked';

export default function SavedScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SubTab>('recipes');
  const [filter, setFilter] = useState<Filter>('all');
  const savedRecipes = mockSavedRecipes();
  const savedAdaptations = mockSavedAdaptations();

  const filteredRecipes = filter === 'all' ? savedRecipes
    : filter === 'cooked' ? savedRecipes.filter(r => r.cooked)
    : savedRecipes.filter(r => !r.cooked);

  return (
    <View style={styles.container}>
      <AccentHeader
        prefix="Your"
        accent="saved"
        sub={`${savedRecipes.length} recipes · ${savedAdaptations.length} adaptations`}
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
        <>
          <View style={styles.filterRow}>
            {(['all', 'want_to_try', 'cooked'] as Filter[]).map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f === 'all' ? 'All' : f === 'want_to_try' ? 'Want to try' : 'Cooked'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <FlatList
            data={filteredRecipes}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card}>
                {item.recipeImage && <Image source={{ uri: item.recipeImage }} style={styles.cardThumb} />}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.recipeTitle}</Text>
                  <Text style={styles.cardMeta}>
                    Saved {new Date(item.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                  {item.cooked && (
                    <View style={styles.cookedTag}>
                      <Text style={styles.cookedTagText}>Cooked {item.cookedAt ? new Date(item.cookedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No saved recipes yet</Text>
                <Text style={styles.emptySubtitle}>Heart recipes you want to try</Text>
              </View>
            }
          />
        </>
      )}

      {activeTab === 'adaptations' && (
        <FlatList
          data={savedAdaptations}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card}>
              {item.recipeImage && <Image source={{ uri: item.recipeImage }} style={styles.cardThumb} />}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.recipeTitle}</Text>
                <Text style={styles.cardMeta}>Adapted · {new Date(item.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No adaptations saved</Text>
              <Text style={styles.emptySubtitle}>When you adapt a recipe, save it here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream, paddingTop: 56 },
  segmented: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: colors.creamDeep, borderRadius: radius.pill, padding: 3, marginBottom: 12 },
  segOption: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.pill },
  segOptionActive: { backgroundColor: colors.paper },
  segText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: colors.inkHint },
  segTextActive: { color: colors.tc700 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.hairline },
  filterChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterChipText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '500', color: colors.inkSoft },
  filterChipTextActive: { color: colors.cream },
  list: { paddingHorizontal: 20, paddingBottom: 48 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, backgroundColor: colors.paper, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline, marginBottom: 8 },
  cardThumb: { width: 54, height: 54, borderRadius: 10 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardTitle: { fontFamily: 'Fraunces', fontSize: 14, fontWeight: '500', color: colors.ink, marginBottom: 3 },
  cardMeta: { fontFamily: 'Inter', fontSize: 11, color: colors.inkHint },
  cookedTag: { backgroundColor: colors.sage100, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill, alignSelf: 'flex-start', marginTop: 3 },
  cookedTagText: { fontFamily: 'Inter', fontSize: 10, fontWeight: '600', color: colors.sage700, letterSpacing: 0.2 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { ...typography.h3, color: colors.ink, marginBottom: spacing.sm },
  emptySubtitle: { ...typography.body, color: colors.inkSoft, textAlign: 'center' },
});
