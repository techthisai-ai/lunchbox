import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dest = path.resolve(__dirname, '../assets');

const ICON_SHEET =
  'C:/Users/acer/.cursor/projects/d-project-lunch/assets/c__Users_acer_AppData_Roaming_Cursor_User_workspaceStorage_5c97932b564f72a3b003a0591002b078_images_image-7c5058f7-d5ea-4b2f-9c17-066f8ef7c10c.png';
const LOGO_SHEET =
  'C:/Users/acer/.cursor/projects/d-project-lunch/assets/c__Users_acer_AppData_Roaming_Cursor_User_workspaceStorage_5c97932b564f72a3b003a0591002b078_images_image-4396c6f8-a5eb-4fb7-9d71-ffdf8dbeaf6f.png';

function isInk(r, g, b, a) {
  if (a < 40) return false;
  const brightness = (r + g + b) / 3;
  return brightness < 235 && !(r > 245 && g > 245 && b > 245);
}

function contentBox(img, x0, y0, x1, y1) {
  let minX = x1;
  let minY = y1;
  let maxX = x0;
  let maxY = y0;
  img.scan(x0, y0, x1 - x0, y1 - y0, (x, y, idx) => {
    const r = img.bitmap.data[idx];
    const g = img.bitmap.data[idx + 1];
    const b = img.bitmap.data[idx + 2];
    const a = img.bitmap.data[idx + 3];
    if (!isInk(r, g, b, a)) return;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });
  if (maxX <= minX || maxY <= minY) {
    throw new Error(`No content in ${x0},${y0} ${x1},${y1}`);
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function padSquare(box, imgW, imgH, pad) {
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  const right = Math.min(imgW, box.x + box.w + pad);
  const bottom = Math.min(imgH, box.y + box.h + pad);
  let w = right - x;
  let h = bottom - y;
  const size = Math.max(w, h);
  let nx = Math.max(0, Math.round(x - (size - w) / 2));
  let ny = Math.max(0, Math.round(y - (size - h) / 2));
  if (nx + size > imgW) nx = imgW - size;
  if (ny + size > imgH) ny = imgH - size;
  return { x: Math.max(0, nx), y: Math.max(0, ny), w: Math.min(size, imgW), h: Math.min(size, imgH) };
}

async function cropWrite(src, box, outPath) {
  const img = await Jimp.read(src);
  img.crop({ x: box.x, y: box.y, w: box.w, h: box.h });
  await img.write(outPath);
  console.log('wrote', path.basename(outPath), box);
}

const icon = await Jimp.read(ICON_SHEET);
console.log('icon sheet', icon.width, icon.height);
const iconBox = contentBox(icon, 0, Math.round(icon.height * 0.16), icon.width, icon.height);
const iconSq = padSquare(iconBox, icon.width, icon.height, 18);
await cropWrite(ICON_SHEET, iconSq, path.join(dest, 'icon.png'));
await cropWrite(ICON_SHEET, iconSq, path.join(dest, 'logo.png'));
await cropWrite(ICON_SHEET, iconSq, path.join(dest, 'splash-icon.png'));
await cropWrite(ICON_SHEET, iconSq, path.join(dest, 'android-icon-foreground.png'));
await cropWrite(ICON_SHEET, iconSq, path.join(dest, 'favicon.png'));

const logos = await Jimp.read(LOGO_SHEET);
console.log('logo sheet', logos.width, logos.height);
const top = Math.round(logos.height * 0.12);
const colW = Math.round(logos.width / 3);
const leftBox = contentBox(logos, 0, top, colW, logos.height);
const rightBox = contentBox(logos, colW * 2, top, logos.width, logos.height);

const leftPad = {
  x: Math.max(0, leftBox.x - 16),
  y: Math.max(0, leftBox.y - 16),
  w: Math.min(logos.width - Math.max(0, leftBox.x - 16), leftBox.w + 32),
  h: Math.min(logos.height - Math.max(0, leftBox.y - 16), leftBox.h + 32),
};
const rightPad = {
  x: Math.max(0, rightBox.x - 16),
  y: Math.max(0, rightBox.y - 16),
  w: Math.min(logos.width - Math.max(0, rightBox.x - 16), rightBox.w + 32),
  h: Math.min(logos.height - Math.max(0, rightBox.y - 16), rightBox.h + 32),
};

await cropWrite(LOGO_SHEET, leftPad, path.join(dest, 'logo-primary.png'));
await cropWrite(LOGO_SHEET, rightPad, path.join(dest, 'logo-login.png'));
