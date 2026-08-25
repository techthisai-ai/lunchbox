import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const src =
  'C:/Users/acer/.cursor/projects/d-project-lunch/assets/c__Users_acer_AppData_Roaming_Cursor_User_workspaceStorage_5c97932b564f72a3b003a0591002b078_images_image-d00be359-614e-40f4-98d8-c7c03a0ddbdb.png';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/logo-splash.png');

function isBackground(r, g, b, a) {
  if (a < 20) return true;
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  return min > 228 && max - min < 40;
}

const img = await Jimp.read(src);
const { width, height, data } = img.bitmap;
const seen = new Uint8Array(width * height);
const queue = [];

function push(x, y) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const i = y * width + x;
  if (seen[i]) return;
  const idx = i * 4;
  if (!isBackground(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) return;
  seen[i] = 1;
  queue.push(i);
}

for (let x = 0; x < width; x++) {
  push(x, 0);
  push(x, height - 1);
}
for (let y = 0; y < height; y++) {
  push(0, y);
  push(width - 1, y);
}

while (queue.length) {
  const i = queue.pop();
  const x = i % width;
  const y = (i - x) / width;
  data[i * 4 + 3] = 0;
  push(x + 1, y);
  push(x - 1, y);
  push(x, y + 1);
  push(x, y - 1);
}

let minX = width;
let minY = height;
let maxX = 0;
let maxY = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] < 10) continue;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
}

const pad = 8;
const box = {
  x: Math.max(0, minX - pad),
  y: Math.max(0, minY - pad),
  w: Math.min(width, maxX + pad) - Math.max(0, minX - pad) + 1,
  h: Math.min(height, maxY + pad) - Math.max(0, minY - pad) + 1,
};

img.crop(box);
await img.write(out);
console.log('wrote', out, box, 'size', img.width, img.height);
