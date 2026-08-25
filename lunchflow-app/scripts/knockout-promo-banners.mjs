import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets');
const OLIVE = [0x51, 0x5b, 0x2f];

function isStudio(r, g, b, a) {
  if (a < 20) return true;
  const brightness = (r + g + b) / 3;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return brightness > 168 && spread < 72;
}

async function fillOlive(srcName, outName, protect) {
  const img = await Jimp.read(path.join(assets, srcName));
  const { width, height, data } = img.bitmap;
  const seen = new Uint8Array(width * height);
  const queue = [];

  function protectedPixel(x, y) {
    if (!protect) return false;
    const dx = (x / width - protect.cx) / protect.rx;
    const dy = (y / height - protect.cy) / protect.ry;
    return dx * dx + dy * dy < 1;
  }

  function push(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    if (protectedPixel(x, y)) return;
    const i = y * width + x;
    if (seen[i]) return;
    const idx = i * 4;
    if (!isStudio(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) return;
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
    const idx = i * 4;
    data[idx] = OLIVE[0];
    data[idx + 1] = OLIVE[1];
    data[idx + 2] = OLIVE[2];
    data[idx + 3] = 255;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  await img.write(path.join(assets, outName));
  console.log('wrote', outName);
}

await fillOlive('promo-tiffin-sticker.png', 'promo-tiffin-sticker-cutout.png', null);
await fillOlive('promo-tiffin-thankyou.png', 'promo-tiffin-thankyou-cutout.png', {
  cx: 0.46,
  cy: 0.48,
  rx: 0.34,
  ry: 0.46,
});
