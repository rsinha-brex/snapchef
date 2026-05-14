import { API_BASE } from '@/lib/api';
import { View, Text, TextInput, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { useState, useCallback, useRef } from 'react';
import { colors, type as typography, spacing, radius } from '@/constants/theme';
import { useCounterStore } from '@/stores/counter';
import ingredients from '@/data/canonical-ingredients.json';

const QUICK_ADD = [
  { name: 'garlic', category: 'produce' },
  { name: 'onion', category: 'produce' },
  { name: 'tomatoes', category: 'produce' },
  { name: 'eggs', category: 'proteins' },
  { name: 'butter', category: 'dairy' },
  { name: 'olive oil', category: 'condiments' },
  { name: 'salt', category: 'pantry_staples' },
  { name: 'pepper', category: 'pantry_staples' },
  { name: 'chicken breast', category: 'proteins' },
  { name: 'rice', category: 'grains' },
  { name: 'pasta', category: 'grains' },
  { name: 'lemon', category: 'produce' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd?: (item: { name: string; category?: string }) => void;
}

export default function ManualAddSheet({ visible, onClose, onAdd }: Props) {
  const { addItem } = useCounterStore();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<typeof ingredients>([]);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (text.length < 2) {
      setSuggestions([]);
      return;
    }
    const localMatches = ingredients
      .filter((item: any) => item.name.toLowerCase().includes(text.toLowerCase()))
      .slice(0, 8);
    setSuggestions(localMatches);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/ingredients/autocomplete?query=${encodeURIComponent(text)}&limit=10`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.suggestions && data.suggestions.length > 0) {
            const merged = [...data.suggestions];
            for (const local of localMatches) {
              if (!merged.some((m: any) => m.name === local.name)) merged.push(local);
            }
            setSuggestions(merged.slice(0, 10));
          }
        }
      } catch {}
    }, 300);
  }, []);

  function handleAdd(name: string, category?: string) {
    if (onAdd) {
      onAdd({ name, category });
    } else {
      addItem({ name, category, source: 'manual' });
    }
    setQuery('');
    setSuggestions([]);
  }

  function handleFreeText() {
    if (query.trim().length > 0) {
      const name = query.trim().toLowerCase();
      if (onAdd) {
        onAdd({ name });
      } else {
        addItem({ name, source: 'manual' });
      }
      setQuery('');
      setSuggestions([]);
    }
  }

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Add ingredients</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.doneBtn}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="Search ingredients..."
            placeholderTextColor={colors.inkMute}
            value={query}
            onChangeText={handleSearch}
            autoFocus
          />
        </View>

        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((item: any) => (
              <TouchableOpacity
                key={item.name}
                style={styles.suggestionRow}
                onPress={() => handleAdd(item.name, item.category)}
              >
                <Text style={styles.suggestionName}>{item.name}</Text>
                <Text style={styles.suggestionCategory}>{item.category}</Text>
              </TouchableOpacity>
            ))}
            {query.length >= 2 && (
              <TouchableOpacity style={styles.freeTextRow} onPress={handleFreeText}>
                <Text style={styles.freeTextLabel}>Use exactly: "</Text>
                <Text style={styles.freeTextValue}>{query}</Text>
                <Text style={styles.freeTextLabel}>"</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {suggestions.length === 0 && query.length === 0 && (
          <View style={styles.quickAdd}>
            <Text style={styles.quickAddLabel}>Quick add</Text>
            <View style={styles.quickAddGrid}>
              {QUICK_ADD.map(item => (
                <TouchableOpacity
                  key={item.name}
                  style={styles.quickAddChip}
                  onPress={() => handleAdd(item.name, item.category)}
                >
                  <Text style={styles.quickAddText}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 100 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(42,31,23,0.3)' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, paddingBottom: 48, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { ...typography.h3, color: colors.ink },
  doneBtn: { ...typography.body, color: colors.tc600, fontWeight: '600' },
  searchRow: { marginBottom: spacing.lg },
  input: { backgroundColor: colors.cream, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 14, fontSize: 15, color: colors.ink, borderWidth: 1, borderColor: colors.hairline },
  suggestions: { marginBottom: spacing.lg },
  suggestionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  suggestionName: { ...typography.body, color: colors.ink, textTransform: 'capitalize' },
  suggestionCategory: { ...typography.bodySm, color: colors.inkHint, textTransform: 'capitalize' },
  freeTextRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.md, backgroundColor: colors.creamDeep, borderRadius: radius.sm, marginTop: spacing.sm },
  freeTextLabel: { ...typography.bodySm, color: colors.inkHint },
  freeTextValue: { ...typography.body, color: colors.tc600, fontWeight: '600' },
  quickAdd: {},
  quickAddLabel: { ...typography.cap, color: colors.inkHint, marginBottom: spacing.md },
  quickAddGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickAddChip: { backgroundColor: colors.cream, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.hairline },
  quickAddText: { ...typography.bodySm, color: colors.ink, textTransform: 'capitalize' },
});
