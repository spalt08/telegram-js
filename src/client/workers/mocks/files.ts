
import { locationToURL } from 'helpers/files';
import { DownloadOptions } from 'client/types';
import photoSquare from './photos/photo_square.jpg';
import photoLandscape from './photos/photo_landscape.jpg';
import walterProfilePhoto from './users/walter.jpg';
import audio from './documents/audio.mp3';
import videoStreamingPreview from './documents/video_streaming_preview.jpg';
import videoStreaming from './documents/video_streaming.mp4';
import { InputFileLocation } from '../../../../packages/mtproto-js/src/tl/layer113/types';

export const fileMap: Record<string, string> = {
  '/photos/4b3881d91b31ad38_x': photoSquare,
  '/photos/4b3881d91b31ad38_m': photoSquare,
  '/photos/4a3056171b31ace0_x': photoLandscape,
  '/photos/4a3056171b31ace0_m': photoLandscape,
  profile_111111_000000000d4b327a: walterProfilePhoto,
  document_4b889d4b00000828_m: videoStreamingPreview,
  document_4b889d4b00000828_: videoStreaming,
  document_1_y: audio,
};

export default function getFilePart(location: InputFileLocation, offset: number, limit: number,
  _options: DownloadOptions, ready: (buf: ArrayBuffer, mime?: string) => void) {
  const url = fileMap[locationToURL(location)];

  console.log('load', url);
  setTimeout(() => {
    fetch(url)
      .then((resp) => resp.arrayBuffer())
      .then((buf) => ready(buf.slice(offset, offset + limit), ''));
  }, 300);
}
