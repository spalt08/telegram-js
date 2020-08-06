import { listen, mount, svgEl } from 'core/dom';
import { useObservable } from 'core/hooks';
import { getAttributeAudio } from 'helpers/files';
import { Document } from 'mtproto-js';
import { Observable } from 'rxjs';
import { MediaPlaybackState } from 'services/audio';
import './waveform.scss';
import { div } from 'core/html';

// Ref: https://github.com/telegramdesktop/tdesktop/blob/0743e71ab6b928d2ee5bae1aed991849b1e2b291/Telegram/SourceFiles/data/data_document.cpp#L1018
function decodeWaveform(encoded5bit: Uint8Array) {
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
    const value = bitsData[byteIndex] + (bitsData[byteIndex + 1] << 8);
    result[i] = ((value >> bitShift) & 0x1F);
  }
  const lastByteIndex = Math.floor(((valuesCount - 1) * 5) / 8);
  const lastBitShift = Math.floor(((valuesCount - 1) * 5) % 8);
  const lastValue = bitsData[lastByteIndex] + (bitsData[lastByteIndex + 1] << 8);
  result[valuesCount - 1] = (lastValue >> lastBitShift) & 0x1F;

  return result;
}

function interpolateArray(data: number[], fitCount: number) {
  let peak = 0;
  const newData = new Array(fitCount);
  const springFactor = data.length / fitCount;
  const leftFiller = data[0];
  const rightFiller = data[data.length - 1];
  for (let i = 0; i < fitCount; i++) {
    const idx = Math.floor(i * springFactor);
    const val = ((data[idx - 1] ?? leftFiller) + (data[idx] ?? leftFiller) + (data[idx + 1] ?? rightFiller)) / 3;
    newData[i] = val;
    if (peak < val) {
      peak = val;
    }
  }
  return { data: newData, peak };
}

type Props = {
  doc: Document.document;
  barsCount: number;
  audioInfo: Observable<MediaPlaybackState>;
  onSeek?: (position: number) => void;
  className?: string;
};

export default function waveform({ doc, barsCount, audioInfo, onSeek, className }: Props) {
  const info = getAttributeAudio(doc);

  const waveformDecoded = decodeWaveform(info && info.waveform ? new Uint8Array(info.waveform) : new Uint8Array(0));

  let thumbX = -Infinity;
  let playProgress = -Infinity;

  const { data, peak } = interpolateArray(waveformDecoded, barsCount);

  const bars: Element[] = [];
  const rootEl = div`.waveform`();
  if (className) {
    rootEl.classList.add(className);
  }

  if (onSeek) {
    listen(rootEl, 'click', (e) => {
      onSeek((e.clientX - rootEl.getBoundingClientRect().left) / rootEl.clientWidth);
    });
  }

  for (let i = 0; i < barsCount; i++) {
    const value = data[i];
    const barHeight = Math.max(0, value / peak);
    const bar = div`.waveform__bar`();
    bar.style.height = `${(barHeight) * 100}%`;
    bars[i] = bar;
    mount(rootEl, bar);
  }

  const currentBar = div`.waveform__bar.-active`({
    style: {
      position: 'absolute',
      bottom: 0,
    },
  });
  mount(rootEl, currentBar);

  const render = () => {
    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      bar.classList.toggle('-active', i < playProgress * bars.length - 1);
    }
    const thumbIndex = Math.round(thumbX / 4);
    if (thumbIndex >= 0 && thumbIndex < bars.length) {
      bars[thumbIndex].classList.add('-active');
    }

    const pp = Math.max(0, Math.min(1, playProgress));
    const index = Math.trunc(pp * bars.length);
    const x = index * 4;
    if (index < data.length) {
      const val = data[index];
      const h = val / peak;
      currentBar.style.opacity = ((pp * bars.length) % 1).toString();
      currentBar.style.left = `${x}px`;
      currentBar.style.height = `${h * 100}%`;
    }
  };

  listen(rootEl, 'mousemove', (e) => {
    thumbX = e.clientX - 1 - rootEl.getBoundingClientRect().left;
    render();
  });

  listen(rootEl, 'mouseleave', () => {
    thumbX = -Infinity;
    render();
  });

  useObservable(rootEl, audioInfo, true, (newInfo) => {
    playProgress = newInfo.playProgress;
    render();
  });

  render();
  return rootEl;
}
