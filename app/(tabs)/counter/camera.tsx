import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, type as typography, spacing, radius } from '@/constants/theme';
import { useCounterStore } from '@/stores/counter';
import { useState, useRef, useEffect, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import LoadingSpinner from '@/components/LoadingSpinner';
import ManualAddSheet from '@/components/ManualAddSheet';

type CameraState = 'viewfinder' | 'processing' | 'review';
type DetectedItem = { name: string; category: string; confidence: string; note?: string; source?: 'photo' | 'manual'; alternatives?: string[] };

export default function CameraScreen() {
  const router = useRouter();
  const { addItems } = useCounterStore();
  const [state, setState] = useState<CameraState>('viewfinder');
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [pickerOpen, setPickerOpen] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelected = useCallback(async (base64: string) => {
    setState('processing');
    setError(null);
    try {
      const response = await fetch('/api/vision/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Detection failed');
      }
      if (!data.items || data.items.length === 0) {
        setError("We couldn't identify any ingredients. Try another photo.");
        setState('viewfinder');
        return;
      }

      const normalizeResp = await fetch('/api/ingredients/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: data.items }),
      });
      let items = data.items.map((item: any) => ({ ...item, source: 'photo' }));
      if (normalizeResp.ok) {
        const normalized = await normalizeResp.json();
        items = normalized.ingredients.map((ing: any) => ({
          name: ing.normalized,
          category: data.items.find((d: any) => d.name === ing.original)?.category || 'other',
          confidence: ing.confidence,
          note: ing.confidence === 'low' ? `detected as "${ing.original}"` : undefined,
          source: 'photo' as const,
          alternatives: ing.alternatives && ing.alternatives.length > 1 ? ing.alternatives : undefined,
        }));
      }

      setDetectedItems(items);
      setState('review');
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
      setState('viewfinder');
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.id = 'camera-file-input';
    document.body.appendChild(input);
    fileInputRef.current = input;

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const base64 = await resizeImage(file);
        handleFileSelected(base64);
      } catch {
        setError('Failed to process image');
      }
      input.value = '';
    });

    return () => {
      document.body.removeChild(input);
      fileInputRef.current = null;
    };
  }, [handleFileSelected]);

  function handleWebUpload() {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  async function handleNativeCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera permission is required to take photos');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      handleFileSelected(result.assets[0].base64);
    }
  }

  async function handleNativeGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      handleFileSelected(result.assets[0].base64);
    }
  }

  function handleManualAdd(item: { name: string; category?: string }) {
    setDetectedItems(prev => {
      if (prev.some(i => i.name.toLowerCase() === item.name.toLowerCase())) return prev;
      return [...prev, {
        name: item.name,
        category: item.category || 'other',
        confidence: 'high',
        source: 'manual' as const,
      }];
    });
  }

  function handleConfirm() {
    addItems(detectedItems.map(item => ({
      name: item.name,
      category: item.category,
      source: (item.source || 'photo') as 'photo' | 'manual',
      confidence: item.confidence as 'high' | 'medium' | 'low',
    })));
    router.replace('/counter');
  }

  function removeDetectedItem(name: string) {
    setDetectedItems(prev => prev.filter(i => i.name !== name));
  }

  function swapItemName(oldName: string, newName: string) {
    setDetectedItems(prev => prev.map(i =>
      i.name === oldName ? { ...i, name: newName, confidence: 'high', note: undefined } : i
    ));
    setPickerOpen(null);
  }

  if (state === 'processing') {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner
          title="Looking at your photo…"
          subtitle="Identifying what's there and how sure we are about each item."
        />
      </View>
    );
  }

  if (state === 'review') {
    return (
      <View style={styles.reviewContainer}>
        <Text style={styles.reviewTitle}>We found {detectedItems.length} ingredient{detectedItems.length !== 1 ? 's' : ''}</Text>
        <Text style={styles.reviewSubtitle}>Tap ▾ to pick a match · tap × to remove</Text>

        <View style={styles.chipWrap}>
          {detectedItems.map(item => (
            <View key={item.name} style={styles.chipContainer}>
              <View
                style={[
                  styles.chip,
                  item.confidence === 'low' && styles.chipLowConf,
                  item.confidence === 'medium' && styles.chipMedConf,
                ]}
              >
                {item.alternatives && item.alternatives.length > 1 ? (
                  <TouchableOpacity
                    style={styles.chipNameBtn}
                    onPress={() => setPickerOpen(pickerOpen === item.name ? null : item.name)}
                  >
                    <Text style={styles.chipName}>{item.name}</Text>
                    <Text style={styles.chipCaret}>▾</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.chipName}>{item.name}</Text>
                )}
                {item.confidence === 'high' && !item.alternatives && (
                  <Text style={styles.chipCheck}>✓</Text>
                )}
                {item.note && <Text style={styles.chipNote}>{item.note}</Text>}
                <TouchableOpacity onPress={() => removeDetectedItem(item.name)}>
                  <Text style={styles.chipRemove}>×</Text>
                </TouchableOpacity>
              </View>
              {pickerOpen === item.name && item.alternatives && (
                <View style={styles.pickerDropdown}>
                  {item.alternatives.map(alt => (
                    <TouchableOpacity
                      key={alt}
                      style={[styles.pickerOption, alt === item.name && styles.pickerOptionActive]}
                      onPress={() => swapItemName(item.name, alt)}
                    >
                      <Text style={[styles.pickerOptionText, alt === item.name && styles.pickerOptionTextActive]}>{alt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addChip} onPress={() => setShowManualAdd(true)}>
            <Text style={styles.addChipText}>+ Add item</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.reviewFooter}>
          <TouchableOpacity style={styles.retakeBtn} onPress={() => setState('viewfinder')}>
            <Text style={styles.retakeBtnText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>Add {detectedItems.length} to counter</Text>
          </TouchableOpacity>
        </View>

        <ManualAddSheet
          visible={showManualAdd}
          onClose={() => setShowManualAdd(false)}
          onAdd={handleManualAdd}
        />
      </View>
    );
  }

  return (
    <View style={styles.viewfinder}>
      <View style={styles.cameraPlaceholder}>
        <Text style={styles.placeholderTitle}>
          {Platform.OS === 'web' ? 'Upload a photo' : 'Snap your ingredients'}
        </Text>
        <Text style={styles.placeholderText}>Take a photo of ingredients on your counter</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
      <View style={styles.shutterBar}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        {Platform.OS === 'web' ? (
          <TouchableOpacity style={styles.uploadBtn} onPress={handleWebUpload}>
            <Text style={styles.uploadBtnText}>Choose photo</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.uploadBtn} onPress={handleNativeCamera}>
              <Text style={styles.uploadBtnText}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.galleryBtn} onPress={handleNativeGallery}>
              <Text style={styles.galleryBtnText}>Gallery</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function resizeImage(file: File, maxDim: number = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

const styles = StyleSheet.create({
  viewfinder: { flex: 1, backgroundColor: colors.cream },
  cameraPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  placeholderTitle: { fontFamily: 'Fraunces', fontSize: 22, fontWeight: '400', color: colors.ink, marginBottom: 8 },
  placeholderText: { fontFamily: 'Inter', fontSize: 14, color: colors.inkSoft, textAlign: 'center' },
  errorText: { fontFamily: 'Inter', fontSize: 13, color: colors.tc600, marginTop: 12, textAlign: 'center' },
  shutterBar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xl, padding: spacing.xl, paddingBottom: 48 },
  cancelBtn: {},
  cancelText: { color: colors.inkSoft, fontSize: 14, fontWeight: '500' },
  uploadBtn: { backgroundColor: colors.tc600, borderRadius: radius.pill, paddingVertical: 14, paddingHorizontal: 28 },
  uploadBtnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.cream },
  galleryBtn: { backgroundColor: colors.creamDeep, borderRadius: radius.pill, paddingVertical: 14, paddingHorizontal: 20 },
  galleryBtnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.inkSoft },
  loadingContainer: { flex: 1, backgroundColor: colors.cream },
  reviewContainer: { flex: 1, backgroundColor: colors.cream, padding: spacing.xl, paddingTop: 60 },
  reviewTitle: { ...typography.h2, color: colors.ink, marginBottom: 4 },
  reviewSubtitle: { ...typography.body, color: colors.inkSoft, marginBottom: spacing.xl },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipContainer: {},
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.hairline },
  chipLowConf: { backgroundColor: colors.saffron100, borderColor: colors.saffron400, borderStyle: 'dashed' },
  chipMedConf: { backgroundColor: colors.saffron100, borderColor: colors.saffron400 },
  chipNameBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  chipName: { ...typography.body, color: colors.ink, textTransform: 'capitalize' },
  chipCaret: { fontSize: 10, color: colors.tc500 },
  chipCheck: { fontSize: 12, color: colors.sage500 },
  chipNote: { ...typography.bodySm, color: colors.saffron600, maxWidth: 120 },
  chipRemove: { fontSize: 18, color: colors.inkMute },
  pickerDropdown: { marginTop: 4, backgroundColor: colors.paper, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline, overflow: 'hidden' },
  pickerOption: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  pickerOptionActive: { backgroundColor: colors.sage100 },
  pickerOptionText: { ...typography.body, color: colors.ink, textTransform: 'capitalize' },
  pickerOptionTextActive: { color: colors.sage700, fontWeight: '600' },
  addChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.tc500, borderStyle: 'dashed' },
  addChipText: { ...typography.body, color: colors.tc500, fontWeight: '500' },
  reviewFooter: { position: 'absolute', bottom: 34, left: spacing.xl, right: spacing.xl, flexDirection: 'row', gap: spacing.md },
  retakeBtn: { flex: 1, backgroundColor: colors.creamDeep, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  retakeBtnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.inkSoft },
  confirmBtn: { flex: 2, backgroundColor: colors.tc600, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  confirmBtnText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.cream },
});
