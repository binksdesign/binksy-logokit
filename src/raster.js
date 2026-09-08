// Write real print-resolution metadata without resampling the rendered pixels.
export async function withResolution(blob, dpi) {
  const data = new Uint8Array(await blob.arrayBuffer());
  if (blob.type === "image/jpeg") {
    for (let i = 2; i < data.length - 16;) {
      if (data[i] !== 255) break;
      const marker = data[i + 1],
        length = data[i + 2] * 256 + data[i + 3];
      if (
        marker === 224 &&
        String.fromCharCode(...data.slice(i + 4, i + 9)) === "JFIF\0"
      ) {
        data[i + 11] = 1;
        data[i + 12] = dpi >> 8;
        data[i + 13] = dpi & 255;
        data[i + 14] = dpi >> 8;
        data[i + 15] = dpi & 255;
        return new Blob([data], { type: blob.type });
      }
      if (marker === 218) break;
      i += length + 2;
    }
    const app = new Uint8Array([
      255,
      224,
      0,
      16,
      74,
      70,
      73,
      70,
      0,
      1,
      1,
      1,
      dpi >> 8,
      dpi & 255,
      dpi >> 8,
      dpi & 255,
      0,
      0,
    ]);
    return new Blob([data.slice(0, 2), app, data.slice(2)], {
      type: blob.type,
    });
  }
  const chunk = new Uint8Array(21),
    dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4);
  dv.setUint32(8, Math.round(dpi / 0.0254));
  dv.setUint32(12, Math.round(dpi / 0.0254));
  chunk[16] = 1;
  let crc = 0xffffffff;
  for (const byte of chunk.slice(4, 17)) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  dv.setUint32(17, (crc ^ 0xffffffff) >>> 0);
  const parts = [data.slice(0, 33), chunk];
  for (let i = 33; i < data.length;) {
    const len =
      new DataView(data.buffer, data.byteOffset + i, 4).getUint32(0) + 12;
    const type = String.fromCharCode(...data.slice(i + 4, i + 8));
    if (type !== "pHYs") parts.push(data.slice(i, i + len));
    i += len;
  }
  return new Blob(parts, { type: blob.type });
}
