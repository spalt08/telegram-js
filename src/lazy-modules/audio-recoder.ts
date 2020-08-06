export default function loadAudioRecorder() {
  return import('opus-media-recorder').then((module) => module.default);
}
