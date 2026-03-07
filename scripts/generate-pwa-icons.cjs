/**
 * Generates pwa-192x192.png and pwa-512x512.png using only Node.js built-ins.
 * Uses the Pure PNG library approach: manually writes a valid PNG file.
 * Based on the PNG spec (IHDR + IDAT + IEND chunks).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const outputDir = path.join(__dirname, '..', 'public');

// --- Minimal PNG encoder (pure Node, no deps) ---
function crc32(buf) {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        table[i] = c;
    }
    let crc = 0xFFFFFFFF;
    for (const b of buf) crc = table[(crc ^ b) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crcBuf = Buffer.concat([typeBytes, data]);
    const crcVal = Buffer.alloc(4);
    crcVal.writeUInt32BE(crc32(crcBuf));
    return Buffer.concat([len, typeBytes, data, crcVal]);
}

function encodePNG(pixels, width, height) {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8;  // bit depth
    ihdrData[9] = 2;  // RGB
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace

    // Raw image data: filter byte (0) + row data for each row
    const rowSize = width * 3;
    const raw = Buffer.alloc((rowSize + 1) * height);
    for (let y = 0; y < height; y++) {
        raw[y * (rowSize + 1)] = 0; // filter type None
        for (let x = 0; x < width; x++) {
            const pi = (y * width + x) * 3;
            const ri = y * (rowSize + 1) + 1 + x * 3;
            raw[ri] = pixels[pi];
            raw[ri + 1] = pixels[pi + 1];
            raw[ri + 2] = pixels[pi + 2];
        }
    }

    const idatData = zlib.deflateSync(raw, { level: 6 });

    return Buffer.concat([
        signature,
        chunk('IHDR', ihdrData),
        chunk('IDAT', idatData),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

// --- Draw the icon into an RGB pixel array ---
function drawZenBookIcon(size) {
    const px = new Uint8Array(size * size * 3);

    const BG = [249, 248, 246]; // ivory #F9F8F6
    const FG = [74, 93, 78];    // sage  #4A5D4E
    const FG2 = [58, 74, 62];    // darker spine

    // Fill background
    for (let i = 0; i < size * size; i++) {
        px[i * 3] = BG[0];
        px[i * 3 + 1] = BG[1];
        px[i * 3 + 2] = BG[2];
    }

    const setPixel = (x, y, color) => {
        if (x < 0 || x >= size || y < 0 || y >= size) return;
        const i = (y * size + x) * 3;
        px[i] = color[0];
        px[i + 1] = color[1];
        px[i + 2] = color[2];
    };

    const fillRect = (x, y, w, h, color) => {
        for (let dy = 0; dy < h; dy++)
            for (let dx = 0; dx < w; dx++)
                setPixel(x + dx, y + dy, color);
    };

    const cx = Math.floor(size / 2);
    const cy = Math.floor(size / 2);
    const bw = Math.floor(size * 0.60);
    const bh = Math.floor(size * 0.44);
    const spine = Math.max(4, Math.floor(size * 0.025));

    const bookLeft = cx - Math.floor(bw / 2);
    const bookTop = cy - Math.floor(bh / 2);

    // Left page (trapezoid: slightly angled top-outer corner)
    const leftW = Math.floor(bw / 2) - spine;
    for (let row = 0; row < bh; row++) {
        const taperOffset = Math.floor(row / bh * size * 0.03);
        const startX = bookLeft + taperOffset;
        const endX = cx - Math.floor(spine / 2);
        for (let col = startX; col < endX; col++)
            setPixel(col, bookTop + row, FG);
    }

    // Right page
    for (let row = 0; row < bh; row++) {
        const taperOffset = Math.floor(row / bh * size * 0.03);
        const startX = cx + Math.ceil(spine / 2);
        const endX = bookLeft + bw - taperOffset;
        for (let col = startX; col < endX; col++)
            setPixel(col, bookTop + row, FG);
    }

    // Spine
    fillRect(cx - Math.floor(spine / 2), bookTop, spine, bh, FG2);

    // Page lines (ivory on sage)
    const lineColor = BG;
    const lw = Math.max(1, Math.floor(size * 0.018));
    const lineOffsets = [0.15, 0.32, -0.08, -0.25];
    for (const offset of lineOffsets) {
        const ly = cy + Math.floor(offset * bh);
        // Left page lines
        const lx1 = bookLeft + Math.floor(size * 0.05);
        const lx2 = cx - Math.floor(spine / 2) - Math.floor(size * 0.03);
        fillRect(lx1, ly, lx2 - lx1, lw, lineColor);
        // Right page lines
        const rx1 = cx + Math.ceil(spine / 2) + Math.floor(size * 0.03);
        const rx2 = bookLeft + bw - Math.floor(size * 0.05);
        fillRect(rx1, ly, rx2 - rx1, lw, lineColor);
    }

    return encodePNG(px, size, size);
}

try {
    const png192 = drawZenBookIcon(192);
    fs.writeFileSync(path.join(outputDir, 'pwa-192x192.png'), png192);
    console.log('✓ pwa-192x192.png');

    const png512 = drawZenBookIcon(512);
    fs.writeFileSync(path.join(outputDir, 'pwa-512x512.png'), png512);
    console.log('✓ pwa-512x512.png');

    console.log('All PWA icons generated.');
} catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
}
