import { WebPDecoder } from 'vendor/libwebp-0.2.0';
import { encode } from 'fast-png';

export function webp2png(file: Response): Promise<Response> {
  return file.arrayBuffer().then((ab) => {
    const data = new Uint8Array(ab);
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
      const rgbaData = buffer.Jb;
      const pngData = encode({
        data: rgbaData,
        width: buffer.width,
        height: buffer.height,
        channels: 4,
        depth: 8,
      });

      const blob = new Blob([pngData], { type: 'image/png' });
      return new Response(blob);
    }

    return file;
  });
}
