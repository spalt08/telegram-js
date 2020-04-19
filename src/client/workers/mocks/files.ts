import photoSquare from './photos/photo_square.jpg';
import photoLandscape from './photos/photo_landscape.jpg';
import walterProfilePhoto from './users/walter.jpg';
import audio from './documents/audio.mp3';
import videoStreamingPreview from './documents/video_streaming_preview.jpg';
import videoStreaming from './documents/video_streaming.mp4';

export default {
  photo_4b3881d91b31ad38_x: [1000, photoSquare],
  photo_4b3881d91b31ad38_m: [1000, photoSquare],
  photo_4a3056171b31ace0_x: [1000, photoLandscape],
  photo_4a3056171b31ace0_m: [1000, photoLandscape],
  profile_111111_000000000d4b327a: [50, walterProfilePhoto],
  document_4b889d4b00000828_m: [2000, videoStreamingPreview],
  document_4b889d4b00000828_: [2000, videoStreaming],
  document_1_y: [2000, audio],
} as Record<string, [number, string]>;
