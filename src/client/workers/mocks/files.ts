import photoSquare from './photos/photo_square.jpg';
import photoLandscape from './photos/photo_landscape.jpg';
import audio from './documents/audio.mp3';

export default {
  photo_4b3881d91b31ad38_x: [1000, photoSquare],
  photo_4b3881d91b31ad38_m: [1000, photoSquare],
  photo_4a3056171b31ace0_x: [1000, photoLandscape],
  photo_4a3056171b31ace0_m: [1000, photoLandscape],
  document_1_y: [2000, audio],
} as Record<string, [number, string]>;
