import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Search, Minus } from 'lucide-react-native';
import { colors, type as typography, spacing, radius } from '@/constants/theme';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import AccentHeader from '@/components/AccentHeader';
import ManualAddSheet from '@/components/ManualAddSheet';
import { MOCK_PANTRY } from '@/lib/mock-data';

const CATEGORIES = ['produce', 'proteins', 'dairy', 'grains', 'pantry_staples', 'condiments'];
const BASICS = ['salt', 'black pepper', 'olive oil', 'garlic', 'onion', 'butter', 'eggs', 'flour', 'sugar', 'rice'];

const EMOJI_MAP: Record<string, string> = {
  'garlic': '🧄', 'onion': '🧅', 'tomatoes': '🍅', 'tomato': '🍅', 'lemon': '🍋', 'spinach': '🥬',
  'basil': '🌿', 'bell pepper': '🫑', 'eggs': '🥚', 'chicken': '🍗', 'chicken breast': '🍗',
  'butter': '🧈', 'parmesan': '🧀', 'cheese': '🧀', 'pasta': '🍝', 'rice': '🍚',
  'salt': '🧂', 'black pepper': '🫙', 'olive oil': '🫒', 'flour': '🌾', 'sugar': '🍬',
  'avocado': '🥑', 'mozzarella': '🧀', 'milk': '🥛',
};
function getEmoji(name: string): string {
  return EMOJI_MAP[name.toLowerCase()] || '🥄';
}

type PantryItem = { id: string; name: string; category?: string; source?: string };

export default function PantryScreen() {
  const { getToken, isSignedIn } = useAuth();
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(
    () => MOCK_PANTRY.map((item, i) => ({ id: `mock-${i}`, ...item }))
  );
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current || !isSignedIn) return;
    hasFetched.current = true;
    setLoading(true);
    (async () => {
      try {
        const token = await getToken();
        const resp = await fetch('/api/me/pantry', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();
        if (data.items && data.items.length > 0) {
          setPantryItems(data.items);
        }
      } catch (e) {
        console.error('Failed to fetch pantry:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [isSignedIn]);

  async function handleAdd(item: { name: string; category?: string }) {
    if (!isSignedIn) {
      const exists = pantryItems.some(p => p.name.toLowerCase() === item.name.toLowerCase());
      if (!exists) {
        setPantryItems(prev => [{ id: `local-${Date.now()}`, name: item.name, category: item.category }, ...prev]);
      }
      return;
    }
    try {
      const token = await getToken();
      const resp = await fetch('/api/me/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: item.name, category: item.category, source: 'manual' }),
      });
      const data = await resp.json();
      if (data.item) {
        setPantryItems(prev => {
          if (prev.some(p => p.id === data.item.id)) return prev;
          return [data.item, ...prev];
        });
      }
    } catch (e) {
      console.error('Failed to add item:', e);
    }
  }

  async function handleDelete(id: string) {
    setPantryItems(prev => prev.filter(i => i.id !== id));
    if (!isSignedIn || id.startsWith('mock-') || id.startsWith('local-')) return;
    try {
      const token = await getToken();
      await fetch(`/api/me/pantry/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.error('Failed to delete item:', e);
    }
  }

  async function handleStockBasics() {
    const existing = new Set(pantryItems.map(p => p.name.toLowerCase()));
    const newItems = BASICS
      .filter(name => !existing.has(name))
      .map(name => ({ name, category: 'pantry_staples', source: 'manual' }));

    if (!isSignedIn) {
      setPantryItems(prev => [...newItems.map((item, i) => ({ id: `local-${Date.now()}-${i}`, ...item })), ...prev]);
      return;
    }
    try {
      const token = await getToken();
      const resp = await fetch('/api/me/pantry/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: newItems }),
      });
      const data = await resp.json();
      if (data.added) {
        setPantryItems(prev => [...data.added, ...prev]);
      }
    } catch (e) {
      console.error('Failed to stock basics:', e);
    }
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = pantryItems.filter(i => i.category === cat);
    if (items.length > 0) acc.push({ category: cat, items });
    return acc;
  }, [] as { category: string; items: PantryItem[] }[]);
  const uncategorized = pantryItems.filter(i => !i.category || !CATEGORIES.includes(i.category));
  if (uncategorized.length > 0) grouped.push({ category: 'other', items: uncategorized });

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <AccentHeader prefix="Your" accent="pantry" />
        <View style={styles.emptyContent}>
          <ActivityIndicator size="large" color={colors.tc600} />
          <Text style={styles.loadingText}>Loading your pantry…</Text>
        </View>
      </View>
    );
  }

  if (pantryItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <AccentHeader prefix="Your" accent="pantry" />
        <View style={styles.emptyContent}>
          <View style={styles.iconCircle}>
            <Text style={{ fontSize: 32 }}>🗄️</Text>
          </View>
          <Text style={styles.emptyTitle}>Stock your kitchen</Text>
          <Text style={styles.emptySubtitle}>Add what you've got and we'll match it to recipes as you browse.</Text>
          <View style={styles.emptyCtas}>
            <TouchableOpacity style={styles.stockBtn} onPress={handleStockBasics}>
              <Text style={styles.stockBtnText}>+ Stock the basics · 10 items</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <AccentHeader prefix="Your" accent="pantry" sub={`${pantryItems.length} items${isSignedIn ? '' : ' · sign in to sync'}`} />
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setEditing(!editing)}>
            <Text style={[styles.editBtn, editing && styles.editBtnActive]}>
              {editing ? 'Done' : 'Edit'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchBtn}>
            <Search size={18} color={colors.inkSoft} />
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={grouped}
        keyExtractor={(item) => item.category}
        contentContainerStyle={styles.list}
        renderItem={({ item: group }) => (
          <View style={styles.categorySection}>
            <View style={styles.catHeader}>
              <Text style={styles.catLabel}>{group.category.replace('_', ' ')}</Text>
              <Text style={styles.catCount}>{group.items.length}</Text>
            </View>
            <View style={styles.grid}>
              {group.items.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.tile, editing && styles.tileEditing]}
                  onPress={() => editing && handleDelete(item.id)}
                  onLongPress={() => handleDelete(item.id)}
                >
                  <View style={styles.tileSwatch}>
                    <Text style={{ fontSize: 14 }}>{getEmoji(item.name)}</Text>
                  </View>
                  <Text style={styles.tileName} numberOfLines={1}>{item.name}</Text>
                  {editing && (
                    <View style={styles.removeCircle}>
                      <Minus size={10} color={colors.cream} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      />
      <View style={styles.footer}>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Add items</Text>
        </TouchableOpacity>
      </View>
      <ManualAddSheet visible={showAdd} onClose={() => setShowAdd(false)} onAdd={handleAdd} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream, paddingTop: 56 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 12, marginRight: 12 },
  editBtn: { fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: colors.tc600 },
  editBtnActive: { fontWeight: '600' },
  searchBtn: { padding: 4 },
  emptyContainer: { flex: 1, backgroundColor: colors.cream, paddingTop: 56 },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  loadingText: { ...typography.body, color: colors.inkSoft, marginTop: spacing.lg },
  iconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.creamDeep, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { ...typography.h2, color: colors.ink, textAlign: 'center', marginBottom: spacing.sm },
  emptySubtitle: { ...typography.body, color: colors.inkSoft, textAlign: 'center', marginBottom: spacing.xl, maxWidth: 260 },
  emptyCtas: { width: '100%', maxWidth: 280 },
  stockBtn: { backgroundColor: colors.tc600, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  stockBtnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.cream },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  categorySection: { marginBottom: 18 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catLabel: { fontFamily: 'Inter', fontSize: 11, fontWeight: '600', letterSpacing: 1.3, textTransform: 'uppercase', color: colors.inkHint },
  catCount: { fontFamily: 'Inter', fontSize: 11, color: colors.inkMute, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: colors.paper, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline, width: '48.5%' },
  tileEditing: { borderColor: colors.tc300 },
  removeCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.tc600, alignItems: 'center', justifyContent: 'center' },
  tileSwatch: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.creamDeep, alignItems: 'center', justifyContent: 'center' },
  tileName: { fontFamily: 'Inter', fontSize: 12, color: colors.ink, textTransform: 'capitalize', flex: 1 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, paddingBottom: 44, backgroundColor: colors.cream, borderTopWidth: 1, borderTopColor: colors.hairline },
  addBtn: { backgroundColor: colors.tc600, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  addBtnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.cream },
});
