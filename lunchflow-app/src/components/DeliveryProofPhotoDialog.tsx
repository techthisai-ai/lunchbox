import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState, type ChangeEvent } from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import { Button } from './Button';

type Props = {
  visible: boolean;
  uploading?: boolean;
  onConfirm: (photoUri: string) => Promise<string | null>;
  onCancel: () => void;
};

export function DeliveryProofPhotoDialog({
  visible,
  uploading = false,
  onConfirm,
  onCancel,
}: Props) {
  const cameraRef = useRef<CameraView>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [error, setError] = useState('');

  const reset = () => {
    setPreviewUri(null);
    setError('');
  };

  const handleClose = () => {
    if (uploading) return;
    reset();
    onCancel();
  };

  const handleCapture = async () => {
    setError('');
    try {
      if (!cameraRef.current) {
        setError('Camera is not ready. Try again.');
        return;
      }
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      if (!photo?.uri) {
        setError('Could not capture photo.');
        return;
      }
      setPreviewUri(photo.uri);
    } catch {
      setError('Could not capture photo.');
    }
  };

  const handleWebFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreviewUri(URL.createObjectURL(file));
    setError('');
    event.target.value = '';
  };

  const handleConfirm = async () => {
    if (!previewUri) return;
    setError('');
    const err = await onConfirm(previewUri);
    if (err) {
      setError(err);
      return;
    }
    reset();
  };

  const ensureCamera = async () => {
    if (Platform.OS === 'web') return true;
    if (permission?.granted) return true;
    const result = await requestPermission();
    return result.granted;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={handleClose}
              disabled={uploading}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
          ) : Platform.OS === 'web' ? (
            <View style={styles.webPickerWrap}>
              {/* @ts-expect-error web file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleWebFile}
              />
              <Button title="Choose / Take Photo" onPress={() => fileInputRef.current?.click()} />
            </View>
          ) : (
            <View style={styles.cameraWrap}>
              <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {previewUri ? (
            <>
              <Button
                title={uploading ? 'Saving…' : 'Send & Deliver'}
                onPress={handleConfirm}
                disabled={uploading}
              />
              <Button title="Retake" variant="outline" onPress={reset} style={{ marginTop: 10 }} disabled={uploading} />
            </>
          ) : Platform.OS === 'web' ? null : (
            <Button
              title="Capture Photo"
              onPress={async () => {
                const ok = await ensureCamera();
                if (!ok) {
                  setError('Camera permission is required.');
                  return;
                }
                await handleCapture();
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  closeBtnPressed: {
    opacity: 0.85,
  },
  cameraWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    height: 260,
    backgroundColor: colors.bg,
  },
  camera: { flex: 1 },
  preview: {
    borderRadius: radius.md,
    height: 260,
    width: '100%',
    backgroundColor: colors.bg,
  },
  webPickerWrap: { marginBottom: spacing.sm },
  error: { color: colors.red, fontSize: 13, marginTop: 10 },
});
