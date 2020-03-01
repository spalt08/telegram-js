import { hexBytesToArray } from 'helpers/files';
import { canvas } from 'core/html';
import './waveform.scss';
import { listen } from 'core/dom';
import { useInterface } from 'core/hooks';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

// Ref: https://github.com/telegramdesktop/tdesktop/blob/0743e71ab6b928d2ee5bae1aed991849b1e2b291/Telegram/SourceFiles/data/data_document.cpp#L1018
function decodeWaveform(encoded5bit: number[]) {
  const bitsCount = encoded5bit.length * 8;
  const valuesCount = Math.floor(bitsCount / 5);
  if (!valuesCount) {
    return [];
  }

  // Read each 5 bit of encoded5bit as 0-31 unsigned char.
  // We count the index of the byte in which the desired 5-bit sequence starts.
  // And then we read a uint16 starting from that byte to guarantee to get all of those 5 bits.
  //
  // BUT! if it is the last byte we have, we're not allowed to read a uint16 starting with it.
  // Because it will be an overflow (we'll access one byte after the available memory).
  // We see, that only the last 5 bits could start in the last available byte and be problematic.
  // So we read in a general way all the entries in a general way except the last one.
  const result = Array(valuesCount);
  const bitsData = encoded5bit;
  for (let i = 0, l = valuesCount - 1; i !== l; ++i) {
    const byteIndex = Math.floor((i * 5) / 8);
    const bitShift = Math.floor((i * 5) % 8);
    const value = (bitsData[byteIndex]) + (bitsData[byteIndex + 1] << 8);
    result[i] = ((value >> bitShift) & 0x1F);
  }
  const lastByteIndex = Math.floor(((valuesCount - 1) * 5) / 8);
  const lastBitShift = Math.floor(((valuesCount - 1) * 5) % 8);
  const lastValue = (bitsData[lastByteIndex]) + ((bitsData[lastByteIndex + 1] ?? 0) << 8);
  result[valuesCount - 1] = (lastValue >> lastBitShift) & 0x1F;

  return result;
}

function interpolateArray(data: number[], fitCount: number) {
  const newData = new Array(fitCount);
  const springFactor = data.length / fitCount;
  const leftFiller = data[0];
  const rightFiller = data[data.length - 1];
  for (let i = 0; i < fitCount; i++) {
    const idx = Math.floor(i * springFactor);
    newData[i] = ((data[idx - 1] ?? leftFiller) + (data[idx] ?? leftFiller) + (data[idx + 1] ?? rightFiller)) / 3;
  }
  return newData;
}

function rgba(rgb: number, a: number) {
  return `rgba(${(rgb & 0xff0000) >> 16},${(rgb & 0xff00) >> 8},${rgb & 0xff}, ${a})`;
}

export default function waveform(
  form: string,
  width: number,
  height: number,
  colorActive: number,
  colorInactive: number,
  seek?: (position: number) => void) {
  const waveformBytes = hexBytesToArray(form);
  let waveformDecoded = decodeWaveform(waveformBytes);

  let thumbX = -Infinity;
  let playProgress = -Infinity;

  const dpr = window.devicePixelRatio;

  const totalBarsCount = Math.floor(width / 4);
  waveformDecoded = interpolateArray(waveformDecoded, totalBarsCount);
  const peak = Math.max(...waveformDecoded);

  const c = canvas`.waveform`();
  const ctx = c.getContext('2d', { alpha: true })!;

  if (seek) {
    listen(c, 'click', (e) => {
      seek((e.clientX - c.getBoundingClientRect().left) / c.clientWidth);
    });
  }

  const render = () => {
    ctx.clearRect(0, 0, width * dpr, height * dpr);

    for (let a = 0; a < waveformDecoded.length; a++) {
      const x = a * (4 * dpr);
      let alpha = 0;
      if (x > thumbX - (4 * dpr) && x <= thumbX) {
        alpha = 1;
      } else if (x < playProgress * width * dpr) {
        alpha = Math.min(1, (playProgress * width * dpr - x) / 4);
      }
      const value = waveformDecoded[a];
      ctx.fillStyle = rgba(colorInactive, 1);
      roundRect(ctx, x, 0, 2 * dpr, dpr * (Math.max(2, Math.round((value * height) / peak))), dpr);
      ctx.fillStyle = rgba(colorActive, alpha);
      roundRect(ctx, x, 0, 2 * dpr, dpr * (Math.max(2, Math.round((value * height) / peak))), dpr);
    }
  };

  listen(c, 'mousemove', (e) => {
    thumbX = e.offsetX * dpr;
    render();
  });

  listen(c, 'mouseleave', () => {
    thumbX = -Infinity;
    render();
  });

  c.style.width = `${width}px`;
  c.style.height = `${height}px`;
  c.width = width * dpr;
  c.height = height * dpr;
  ctx.scale(1, -1);
  ctx.translate(0, -height * dpr);
  render();
  return useInterface(c, {
    updateProgress: (progress: number) => {
      playProgress = progress;
      render();
    },
  });
}
