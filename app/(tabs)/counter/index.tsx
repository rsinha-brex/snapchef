import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Camera } from 'lucide-react-native';
import { colors, type as typography, spacing, radius } from '@/constants/theme';
import { useCounterStore } from '@/stores/counter';
import AccentHeader from '@/components/AccentHeader';
import ManualAddSheet from '@/components/ManualAddSheet';
import PantryPullSheet from '@/components/PantryPullSheet';

export default function CounterScreen() {
  const router = useRouter();
  const { items, removeItem, clear } = useCounterStore();
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showPantryPull, setShowPantryPull] = useState(false);

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <AccentHeader prefix="Your" accent="counter" sub="Nothing yet · let's build a meal" />
        <View style={styles.emptyContent}>
          <View style={styles.iconCircle}>
            <Camera size={38} color={colors.tc500} />
          </View>
          <Text style={styles.emptyTitle}>What's on your counter?</Text>
          <Text style={styles.emptySubtitle}>
            Snap a photo of what you've got, or add items manually to start cooking.
          </Text>

          <View style={styles.ctas}>
            <TouchableOpacity style={styles.primaryCta} onPress={() => router.push('/(tabs)/counter/camera')}>
              <Camera size={16} color={colors.cream} />
              <Text style={styles.primaryCtaText}>Take a photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryCta} onPress={() => setShowManualAdd(true)}>
              <Text style={styles.secondaryCtaText}>Add manually</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostCta} onPress={() => setShowPantryPull(true)}>
              <Text style={styles.ghostCtaText}>Pull from pantry</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ManualAddSheet visible={showManualAdd} onClose={() => setShowManualAdd(false)} showCameraButton />
        <PantryPullSheet visible={showPantryPull} onClose={() => setShowPantryPull(false)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AccentHeader prefix="Your" accent="counter" sub={`${items.length} item${items.length !== 1 ? 's' : ''} · ready to cook`} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.category && <Text style={styles.itemCategory}>{item.category}</Text>}
            </View>
            <TouchableOpacity onPress={() => removeItem(item.id)}>
              <Text style={styles.removeBtn}>×</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.secondaryFooterBtn} onPress={clear}>
          <Text style={styles.secondaryFooterText}>Clear all</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addMoreBtn} onPress={() => setShowManualAdd(true)}>
          <Text style={styles.addMoreBtnText}>+ Add</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryFooterBtn}
          onPress={() => router.push('/(tabs)/counter/match')}
        >
          <Text style={styles.primaryFooterText}>Find recipes</Text>
        </TouchableOpacity>
      </View>

      <ManualAddSheet visible={showManualAdd} onClose={() => setShowManualAdd(false)} showCameraButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream, paddingTop: 56 },
  emptyContainer: { flex: 1, backgroundColor: colors.cream, paddingTop: 56 },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  iconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.creamDeep, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { ...typography.h2, color: colors.ink, textAlign: 'center', marginBottom: spacing.sm },
  emptySubtitle: { ...typography.body, color: colors.inkSoft, textAlign: 'center', lineHeight: 22, marginBottom: spacing.md, maxWidth: 260 },
  pantryHint: { ...typography.bodySm, color: colors.sage500, fontWeight: '500', marginBottom: spacing.xl },
  ctas: { width: '100%', gap: spacing.md, maxWidth: 280 },
  primaryCta: { backgroundColor: colors.tc600, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  primaryCtaText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.cream },
  secondaryCta: { backgroundColor: colors.creamDeep, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  secondaryCtaText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.ink },
  ghostCta: { borderWidth: 1, borderColor: colors.hairlineStrong, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  ghostCtaText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: colors.inkSoft },
  list: { padding: spacing.lg, paddingBottom: 120 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.paper, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.hairline },
  itemName: { ...typography.body, color: colors.ink, fontWeight: '500', textTransform: 'capitalize' },
  itemCategory: { ...typography.bodySm, color: colors.inkHint, marginTop: 2 },
  removeBtn: { fontSize: 24, color: colors.inkMute, paddingHorizontal: 8 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, paddingBottom: 44, backgroundColor: colors.cream, borderTopWidth: 1, borderTopColor: colors.hairline },
  secondaryFooterBtn: { flex: 1, backgroundColor: colors.creamDeep, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  secondaryFooterText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.inkSoft },
  addMoreBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.tc500, borderStyle: 'dashed', borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  addMoreBtnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.tc500 },
  primaryFooterBtn: { flex: 2, backgroundColor: colors.tc600, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  primaryFooterText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.cream },
});
