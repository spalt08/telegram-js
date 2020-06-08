import { WebPDecoder } from 'vendor/libwebp-0.2.0';

export function decodeWebP(source: ArrayBuffer) {
  const data = new Uint8Array(source);
  const decoder = new WebPDecoder();
  const config = decoder.WebPDecoderConfig;
  const buffer = config.j || config.output;
  const bitstream = config.input;

  decoder.WebPInitDecoderConfig(config);
  decoder.WebPGetFeatures(data, data.length, bitstream);

  /** MODE_RGBA = 1 MODE_ARGB = 4, */
  buffer.J = 1;

  let status;
  try {
    status = decoder.WebPDecode(data, data.length, config);
  } catch (e) {
    status = e;
  }

  if (status === 0) {
    return { data: new Uint8Array(buffer.Jb).buffer, width: buffer.width as number, height: buffer.height as number };
  }

  throw new Error('Unable to decode');
}
