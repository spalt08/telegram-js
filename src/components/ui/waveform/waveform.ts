import { hexBytesToArray } from 'helpers/files';
import { nothing, canvas } from 'core/html';
import './waveform.scss';
import { listen } from 'core/dom';

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

export default function waveform(form: string, width: number, height: number, colorActive: string, colorInactive: string) {
  const waveformBytes = hexBytesToArray(form);
  // // const r = heights;
  // const r = [];
  // for (let i = 0; i < waveformBytes.length * (2 / 3); i++) {
  //   const h = (waveformBytes[i * 2] + waveformBytes[i * 2 + 1] + waveformBytes[i * 2 + 2]) / 3;
  //   r.push(h);
  // }

  let thumbX = -Infinity;

  const dpr = window.devicePixelRatio;

  const totalBarsCount = width / 4;

  if (totalBarsCount <= 0.1) {
    return nothing;
  }

  const c = canvas`.waveform`();
  const ctx = c.getContext('2d', { alpha: true })!;

  const render = () => {
    ctx.clearRect(0, 0, width * dpr, height * dpr);

    const samplesCount = (waveformBytes.length * 8) / 5;
    const samplesPerBar = samplesCount / totalBarsCount;
    let barCounter = 0;
    let nextBarNum = 0;
    let barNum = 0;
    let lastBarNum;
    let drawBarCount;

    for (let a = 0; a < samplesCount; a++) {
      if (a !== nextBarNum) {
        continue;
      }
      drawBarCount = 0;
      lastBarNum = nextBarNum;
      while (lastBarNum === nextBarNum) {
        barCounter += samplesPerBar;
        nextBarNum = Math.floor(barCounter);
        drawBarCount++;
      }

      const bitPointer = a * 5;
      const byteNum = Math.floor(bitPointer / 8);
      const byteBitOffset = bitPointer - byteNum * 8;
      const currentByteCount = 8 - byteBitOffset;
      const nextByteRest = 5 - currentByteCount;
      let value = (waveformBytes[byteNum] >> byteBitOffset) & ((2 << (Math.min(5, currentByteCount) - 1)) - 1);
      if (nextByteRest > 0 && byteNum + 1 < waveformBytes.length) {
        value <<= nextByteRest;
        value |= waveformBytes[byteNum + 1] & ((2 << (nextByteRest - 1)) - 1);
      }

      for (let b = 0; b < drawBarCount; b++) {
        const x = barNum * (4 * dpr);
        if (x > thumbX - (4 * dpr) && x <= thumbX + (0 * dpr)) {
          ctx.fillStyle = colorActive;
        } else {
          ctx.fillStyle = colorInactive;
        }
        roundRect(ctx, x, 0, 2 * dpr, dpr * (Math.max(2, Math.round((value * height) / 31))), dpr);
        barNum++;
      }
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
  return c;
}
