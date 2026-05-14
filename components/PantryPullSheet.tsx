import { View, Text, TouchableOpacity, Pressable, FlatList, StyleSheet } from 'react-native';
import { colors, type as typography, spacing, radius } from '@/constants/theme';
import { useCounterStore } from '@/stores/counter';
import { MOCK_PANTRY } from '@/lib/mock-data';
import { useState } from 'react';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function PantryPullSheet({ visible, onClose }: Props) {
  const { addItems } = useCounterStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleItem(name: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handleConfirm() {
    const items = MOCK_PANTRY
      .filter(p => selected.has(p.name))
      .map(p => ({ name: p.name, category: p.category, source: 'pantry-pull' as const }));
    addItems(items);
    setSelected(new Set());
    onClose();
  }

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Pull from pantry</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>Select ingredients to add to your counter</Text>

        <FlatList
          data={MOCK_PANTRY}
          keyExtractor={item => item.name}
          style={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, selected.has(item.name) && styles.rowSelected]}
              onPress={() => toggleItem(item.name)}
            >
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.check}>{selected.has(item.name) ? '✓' : ''}</Text>
            </TouchableOpacity>
          )}
        />

        {selected.size > 0 && (
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmText}>Add {selected.size} to counter</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 100 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(42,31,23,0.3)' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, paddingBottom: 48, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { ...typography.h3, color: colors.ink },
  cancelBtn: { ...typography.body, color: colors.inkSoft },
  hint: { ...typography.bodySm, color: colors.inkHint, marginBottom: spacing.lg },
  list: { maxHeight: 400 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  rowSelected: { backgroundColor: colors.sage100 },
  rowName: { ...typography.body, color: colors.ink, textTransform: 'capitalize' },
  check: { fontSize: 16, color: colors.sage500, fontWeight: '600' },
  confirmBtn: { backgroundColor: colors.tc600, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg },
  confirmText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.cream },
});
