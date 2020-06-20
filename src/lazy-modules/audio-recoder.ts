export default function loadAudioRecorder() {
  return import('audio-recorder-polyfill').then((module) => module.default);
}
