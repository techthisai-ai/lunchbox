import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../../constants/theme';
import {
  PROMO_CAROUSEL_HEIGHT,
  PROMO_CAROUSEL_REFERENCE_WIDTH,
} from '../../services/promoAdService';
import {
  centeredPan,
  computeCropPreviewSize,
  coverScale,
  CROP_PREVIEW_MAX_WIDTH,
  exportCroppedBannerBlob,
  loadImageSize,
  panForZoomChange,
} from '../../utils/promoBannerCrop';
import { Button } from '../Button';

type Props = {
  visible: boolean;
  imageUri: string | null;
  onCancel: () => void;
  onConfirm: (croppedUri: string) => void;
  frameReferenceWidth?: number;
  frameReferenceHeight?: number;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

type DragState = {
  startX: number;
  startY: number;
  panX: number;
  panY: number;
};

export function PromoBannerCropDialog({
  visible,
  imageUri,
  onCancel,
  onConfirm,
  frameReferenceWidth = PROMO_CAROUSEL_REFERENCE_WIDTH,
  frameReferenceHeight = PROMO_CAROUSEL_HEIGHT,
}: Props) {
  const isPortraitFrame = frameReferenceHeight > frameReferenceWidth;
  const initialPreview = computeCropPreviewSize(
    frameReferenceWidth,
    frameReferenceHeight,
    CROP_PREVIEW_MAX_WIDTH,
  );
  const [frameWidth, setFrameWidth] = useState(initialPreview.width);
  const [frameHeight, setFrameHeight] = useState(initialPreview.height);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const dragRef = useRef<DragState | null>(null);

  const applyPreviewSize = useCallback(
    (availableWidth: number) => {
      const next = computeCropPreviewSize(frameReferenceWidth, frameReferenceHeight, availableWidth);
      setFrameWidth(next.width);
      setFrameHeight(next.height);
    },
    [frameReferenceHeight, frameReferenceWidth],
  );

  useEffect(() => {
    if (visible) {
      applyPreviewSize(CROP_PREVIEW_MAX_WIDTH);
    }
  }, [applyPreviewSize, frameReferenceHeight, frameReferenceWidth, visible]);

  const resetTransform = useCallback(
    (size: { width: number; height: number }, nextZoom = 1) => {
      const scale = coverScale(size.width, size.height, frameWidth, frameHeight, nextZoom);
      setZoom(nextZoom);
      setPan(centeredPan(size.width, size.height, frameWidth, frameHeight, scale));
    },
    [frameHeight, frameWidth],
  );

  useEffect(() => {
    if (!visible || !imageUri) {
      setNaturalSize(null);
      setError('');
      setExporting(false);
      return;
    }

    setLoading(true);
    setError('');
    void loadImageSize(imageUri)
      .then((size) => {
        setNaturalSize(size);
        resetTransform(size, 1);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Could not load image');
      })
      .finally(() => setLoading(false));
  }, [visible, imageUri, resetTransform, frameWidth, frameHeight]);

  useEffect(() => {
    if (!naturalSize || !visible) return;
    resetTransform(naturalSize, zoom);
  }, [frameWidth, frameHeight]); // eslint-disable-line react-hooks/exhaustive-deps

  const scale = useMemo(() => {
    if (!naturalSize) return 1;
    return coverScale(naturalSize.width, naturalSize.height, frameWidth, frameHeight, zoom);
  }, [naturalSize, frameWidth, frameHeight, zoom]);

  const imageStyle = useMemo(() => {
    if (!naturalSize) return null;
    return {
      width: naturalSize.width * scale,
      height: naturalSize.height * scale,
      transform: [{ translateX: pan.x }, { translateY: pan.y }],
    };
  }, [naturalSize, scale, pan.x, pan.y]);

  const beginDrag = (clientX: number, clientY: number) => {
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const moveDrag = (clientX: number, clientY: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    setPan({
      x: drag.panX + (clientX - drag.startX),
      y: drag.panY + (clientY - drag.startY),
    });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const updateZoom = (nextZoom: number) => {
    if (!naturalSize) return;
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    const oldScale = coverScale(naturalSize.width, naturalSize.height, frameWidth, frameHeight, zoom);
    const newScale = coverScale(naturalSize.width, naturalSize.height, frameWidth, frameHeight, clamped);
    setPan(panForZoomChange(frameWidth, frameHeight, pan.x, pan.y, oldScale, newScale));
    setZoom(clamped);
  };

  const handleConfirm = async () => {
    if (!imageUri || !naturalSize) return;
    setExporting(true);
    setError('');
    try {
      const blob = await exportCroppedBannerBlob(imageUri, {
        panX: pan.x,
        panY: pan.y,
        zoom,
        frameWidth,
        frameHeight,
        naturalWidth: naturalSize.width,
        naturalHeight: naturalSize.height,
      });
      const croppedUri = URL.createObjectURL(blob);
      onConfirm(croppedUri);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Could not crop image');
    } finally {
      setExporting(false);
    }
  };

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, isPortraitFrame && styles.cardPortrait]}>
            <Text style={styles.title}>Crop banner</Text>

            <View
              style={styles.frameWrap}
              onLayout={(event) => {
                const available = event.nativeEvent.layout.width;
                if (available <= 0) return;
                const next = computeCropPreviewSize(frameReferenceWidth, frameReferenceHeight, available);
                if (Math.abs(next.width - frameWidth) > 1 || Math.abs(next.height - frameHeight) > 1) {
                  setFrameWidth(next.width);
                  setFrameHeight(next.height);
                }
              }}
            >
              <View
                style={[styles.frame, { width: frameWidth, height: frameHeight }]}
                // @ts-expect-error web pointer handlers
                onMouseDown={(event: MouseEvent) => beginDrag(event.clientX, event.clientY)}
                onMouseMove={(event: MouseEvent) => moveDrag(event.clientX, event.clientY)}
                onMouseUp={endDrag}
                onMouseLeave={endDrag}
                onTouchStart={(event) => {
                  const touch = event.nativeEvent.touches[0];
                  if (!touch) return;
                  beginDrag(touch.pageX, touch.pageY);
                }}
                onTouchMove={(event) => {
                  const touch = event.nativeEvent.touches[0];
                  if (!touch) return;
                  moveDrag(touch.pageX, touch.pageY);
                }}
                onTouchEnd={endDrag}
              >
                {loading ? (
                  <View style={styles.frameLoading}>
                    <ActivityIndicator color={colors.orange} />
                  </View>
                ) : imageUri && imageStyle ? (
                  <>
                    <View style={styles.imageLayer}>
                      {/* eslint-disable-next-line jsx-a11y/alt-text */}
                      <img
                        src={imageUri}
                        draggable={false}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: imageStyle.width,
                          height: imageStyle.height,
                          transform: `translate(${pan.x}px, ${pan.y}px)`,
                          userSelect: 'none',
                          pointerEvents: 'none',
                        }}
                      />
                    </View>
                    <View style={styles.frameGuide} pointerEvents="none" />
                  </>
                ) : null}
              </View>
            </View>

            <View style={styles.zoomRow}>
              <Pressable style={styles.zoomBtn} onPress={() => updateZoom(zoom - 0.15)} accessibilityLabel="Zoom out">
                <Ionicons name="remove" size={18} color={colors.text} />
              </Pressable>
              <Text style={styles.zoomLabel}>Zoom</Text>
              <Pressable style={styles.zoomBtn} onPress={() => updateZoom(zoom + 0.15)} accessibilityLabel="Zoom in">
                <Ionicons name="add" size={18} color={colors.text} />
              </Pressable>
              <Pressable style={styles.resetBtn} onPress={() => naturalSize && resetTransform(naturalSize, 1)}>
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              title={exporting ? 'Cropping...' : 'Use cropped image'}
              onPress={() => void handleConfirm()}
              style={{ marginTop: spacing.md }}
            />
            <Button title="Cancel" variant="outline" onPress={onCancel} style={{ marginTop: 10 }} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(63,71,36,0.45)',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 580,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadow.elevated,
  },
  cardPortrait: {
    maxWidth: 420,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  frameWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  frame: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.orange,
    cursor: 'grab',
  },
  frameLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  frameGuide: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: spacing.md,
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  zoomLabel: { fontSize: 13, fontWeight: '700', color: colors.text, minWidth: 42, textAlign: 'center' },
  resetBtn: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetText: { fontSize: 12, fontWeight: '700', color: colors.orange },
  error: { color: colors.red, fontSize: 13, marginTop: spacing.sm, textAlign: 'center' },
});
