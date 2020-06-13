export default async function loadAudioRecorder() {
  const AudioRecorder = await import('audio-recorder-polyfill')
    .then((module) => module.default);
  const mpegEncoder = await import('audio-recorder-polyfill/mpeg-encoder')
    .then((module) => module.default);

  // audio/wav don't can be voice :(
  AudioRecorder.encoder = mpegEncoder;
  AudioRecorder.prototype.mimeType = 'audio/mpeg';

  return AudioRecorder;
}
