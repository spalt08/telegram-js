export type Header = {
  version: number,
  totalFrames: number,
  frameRate: number,
  width: number,
};

const buffer = new Uint8Array(128000);

export function compress(data: Uint8ClampedArray, header: Header): ArrayBuffer {
  const pixels = new Uint32Array(data.buffer);
  const palette = new Map<number, number>();

  let cc = 0; let count = 0;
  let offset = buffer.length / 2;
  let i = offset + 1;
  let prev = pixels[buffer.length];


  /** Pixel Data */
  for (let j = 0; j < pixels.length; j++) {
    const pixel = pixels[j];
    count++;

    if (prev !== pixel || count === 0xFF || j === pixels.length - 1) {
      let code = palette.get(prev);
      if (code === undefined) palette.set(prev, code = cc++);

      buffer[i++] = code >> 8;
      buffer[i++] = code & 0xFF;
      buffer[i++] = count;

      count = 0;
    }

    prev = pixel;
  }

  /** Palette */
  const colors = palette.size;
  offset -= colors * 4;
  const colorsBytes = new Uint32Array(buffer.buffer, offset, colors);

  palette.forEach((code, pixel) => {
    colorsBytes[code] = pixel;
  });

  /** Header */
  offset--;
  buffer[offset--] = colors & 0xFF;
  buffer[offset--] = colors >> 8;
  buffer[offset--] = header.width & 0xFF;
  buffer[offset--] = header.width >> 8;
  buffer[offset--] = header.frameRate;
  buffer[offset--] = header.totalFrames & 0xFF;
  buffer[offset--] = header.totalFrames >> 8;
  buffer[offset--] = header.version;

  return buffer.buffer.slice(offset + 1, i);
}

export function decompress(raw: ArrayBuffer): { rgba: Uint8ClampedArray, header: Header } {
  const data = new Uint8Array(raw);
  let i = 0;

  /** Header */
  const version = data[i++];
  const totalFrames = (data[i++] << 8) ^ data[i++];
  const frameRate = data[i++];
  const width = (data[i++] << 8) ^ data[i++];
  const colors = (data[i++] << 8) ^ data[i++];

  /** Pixel Data */
  const colorsBytes = new Uint32Array(raw, i, colors);
  const pixels = new Uint32Array(width * width);
  i += colors * 4 + 1;

  let j = 0;
  for (; i < buffer.length; i += 3) {
    const code = (data[i] << 8) ^ data[i + 1];
    const pixel = colorsBytes[code] || 0;
    const count = data[i + 2];

    for (let n = 0; n < count; n++) pixels[j++] = pixel;
  }

  return {
    rgba: new Uint8ClampedArray(pixels.buffer),
    header: { version, totalFrames, frameRate, width },
  };
}