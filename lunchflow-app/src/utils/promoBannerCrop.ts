const BANNER_MAX_WIDTH = 1400;
const BANNER_JPEG_QUALITY = 0.88;

export type CropTransform = {
  panX: number;
  panY: number;
  zoom: number;
  frameWidth: number;
  frameHeight: number;
  naturalWidth: number;
  naturalHeight: number;
};

export function promoCropFrameHeight(
  frameWidth: number,
  referenceWidth: number,
  referenceHeight: number,
): number {
  return Math.round(frameWidth * (referenceHeight / referenceWidth));
}

/** Max crop preview size in the admin dialog (export still uses reference dimensions). */
export const CROP_PREVIEW_MAX_WIDTH = 460;
export const CROP_PREVIEW_MAX_HEIGHT = 620;

export function computeCropPreviewSize(
  referenceWidth: number,
  referenceHeight: number,
  availableWidth: number,
): { width: number; height: number } {
  const aspect = referenceWidth / referenceHeight;
  const maxW = Math.min(CROP_PREVIEW_MAX_WIDTH, Math.max(availableWidth, 1));
  const maxH = CROP_PREVIEW_MAX_HEIGHT;

  let height = maxH;
  let width = Math.round(height * aspect);

  if (width > maxW) {
    width = Math.round(maxW);
    height = Math.round(width / aspect);
  }

  return { width, height };
}

export function coverScale(
  naturalWidth: number,
  naturalHeight: number,
  frameWidth: number,
  frameHeight: number,
  zoom: number,
): number {
  return Math.max(frameWidth / naturalWidth, frameHeight / naturalHeight) * zoom;
}

export function centeredPan(
  naturalWidth: number,
  naturalHeight: number,
  frameWidth: number,
  frameHeight: number,
  scale: number,
): { x: number; y: number } {
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return {
    x: (frameWidth - width) / 2,
    y: (frameHeight - height) / 2,
  };
}

export function panForZoomChange(
  frameWidth: number,
  frameHeight: number,
  panX: number,
  panY: number,
  oldScale: number,
  newScale: number,
): { x: number; y: number } {
  const centerX = frameWidth / 2;
  const centerY = frameHeight / 2;
  const imageCenterX = (centerX - panX) / oldScale;
  const imageCenterY = (centerY - panY) / oldScale;
  return {
    x: centerX - imageCenterX * newScale,
    y: centerY - imageCenterY * newScale,
  };
}

export function loadImageSize(imageUri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Image crop is available on the admin web portal.'));
      return;
    }

    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Could not load the selected image.'));
    img.src = imageUri;
  });
}

export async function exportCroppedBannerBlob(imageUri: string, transform: CropTransform): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('Image crop is available on the admin web portal.');
  }

  const {
    panX,
    panY,
    zoom,
    frameWidth,
    frameHeight,
    naturalWidth,
    naturalHeight,
  } = transform;

  const scale = coverScale(naturalWidth, naturalHeight, frameWidth, frameHeight, zoom);
  const srcX = Math.max(0, -panX / scale);
  const srcY = Math.max(0, -panY / scale);
  const srcW = Math.min(naturalWidth - srcX, frameWidth / scale);
  const srcH = Math.min(naturalHeight - srcY, frameHeight / scale);

  const outWidth = BANNER_MAX_WIDTH;
  const outHeight = Math.round(outWidth * (frameHeight / frameWidth));

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new window.Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Could not load the selected image.'));
    element.src = imageUri;
  });

  const canvas = document.createElement('canvas');
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not crop image.');
  }

  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outWidth, outHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Could not crop image.'))),
      'image/jpeg',
      BANNER_JPEG_QUALITY,
    );
  });
}
