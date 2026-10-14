// Draws the app icons (a white check mark on a blue rounded square) into public/. Run once.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

function crc32(buf) {
  let c,
    crc = ~0;
  for (const b of buf) {
    c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}
const chunk = (type, data) => {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
};

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax,
    dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function icon(size, file) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const r = size * 0.18;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const cx = Math.min(Math.max(x, r), size - r),
        cy = Math.min(Math.max(y, r), size - r);
      const inside = Math.hypot(x - cx, y - cy) <= r;
      const u = x / size,
        v = y / size;
      const d = Math.min(
        segDist(u, v, 0.27, 0.52, 0.43, 0.68),
        segDist(u, v, 0.43, 0.68, 0.74, 0.34),
      );
      const check = d < 0.055;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      const [R, G, B] = check ? [255, 255, 255] : [37, 99, 235];
      raw[o] = R;
      raw[o + 1] = G;
      raw[o + 2] = B;
      raw[o + 3] = inside ? 255 : 0;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

icon(192, "public/icon-192.png");
icon(512, "public/icon-512.png");
