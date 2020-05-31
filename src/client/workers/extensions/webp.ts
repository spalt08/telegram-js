import { WebPDecoder } from 'vendor/libwebp-0.2.0';
import { encode } from 'fast-png';

export function decode(data: Uint8Array) {
  const decoder = new WebPDecoder();
  const config = decoder.WebPDecoderConfig;
  const buffer = config.j || config.output;
  const bitstream = config.input;

  decoder.WebPInitDecoderConfig(config);
  decoder.WebPGetFeatures(data, data.length, bitstream);

  buffer.colorspace = decoder.WEBP_CSP_MODE.MODE_RGBA;
  buffer.J = 4;

  let status;
  try {
    status = decoder.WebPDecode(data, data.length, config);
  } catch (e) {
    status = e;
  }

  console.log(status, buffer, bitstream);

  const rgbaData = new Uint8Array(buffer.c.RGBA.ma);
  const pngData = encode({
    data: rgbaData,
    width: buffer.width,
    height: buffer.height,
    channels: 4,
    depth: 8,
  });

  const blob = new Blob([pngData], { type: 'image/png' });

  return URL.createObjectURL(blob);
}
