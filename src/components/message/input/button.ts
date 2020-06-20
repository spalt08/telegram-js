import EncoderWorker from 'worker-loader!opus-media-recorder/encoderWorker.js';
import { div, text } from 'core/html';
import * as icons from 'components/icons';
import { useInterface } from 'core/hooks';
import { listen, mount, unmount } from 'core/dom';
import loadAudioRecorder from '../../../lazy-modules/audio-recoder';
import './button.scss';

type RecordResult = {
  blob: Blob,
  duration: number,
  waveform: Uint8Array,
};

type Props = {
  onMessage: () => void,
  onAudio: (result: RecordResult) => void,
  onStartRecording: () => void,
  onFinishRecording: () => void,
};

type Handler = (volume: number, time: number) => void;

async function startStream() {
  // eslint-disable-next-line compat/compat
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });

  const finishStream = () => {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  };

  return {
    stream,
    finishStream,
  };
}

function startAnalyze(stream: MediaStream, handler: Handler) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;

  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  source.connect(analyser);
  let isDestroyed = false;

  function tick(time: number) {
    if (isDestroyed) {
      return;
    }

    analyser.getByteTimeDomainData(dataArray);
    handler(Math.max(...dataArray), time);
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  return () => {
    isDestroyed = true;
  };
}

async function startRecord(handler: Handler) {
  const chunks: Blob[] = [];
  const recordStartTime = Date.now();

  const { stream, finishStream } = await startStream();

  const finishAnalyze = startAnalyze(stream, (volume, time) => {
    // console.log(`${volume} / ${Math.floor(time)}`);

    handler(volume, time);
  });

  const AudioRecorder = await loadAudioRecorder();

  const audioRecorder = new AudioRecorder(stream, {
    mimeType: 'audio/ogg',
  }, {
    encoderWorkerFactory: _ => new EncoderWorker(),
    OggOpusEncoderWasmPath: 'https://cdn.jsdelivr.net/npm/opus-media-recorder@0.8.0/OggOpusEncoder.wasm',
    WebMOpusEncoderWasmPath: 'https://cdn.jsdelivr.net/npm/opus-media-recorder@0.8.0/WebMOpusEncoder.wasm',
  });

  audioRecorder.start();

  let handleData = () => {};

  audioRecorder.addEventListener('dataavailable', (event) => {
    chunks.push(event.data);

    handleData();
  });

  // eslint-disable-next-line arrow-body-style
  return () => {
    return new Promise((resolve, _reject) => {
      handleData = () => {
        resolve({
          blob: new Blob(chunks, {
            // audio/wav don't can be voice :(
            type: 'audio/ogg',
          }),
          duration: Math.round((Date.now() - recordStartTime) / 1000),
        });
      };

      audioRecorder.stop();
      finishAnalyze();
      finishStream();
    });
  };
}

export default function recordSendButton({
  onMessage,
  onAudio,
  onStartRecording,
  onFinishRecording,
}: Props) {
  const sendIcon = icons.send({ className: 'msgRecordSend__ic-send' });
  const recordIcon = icons.microphone2({
    className: 'msgRecordSend__ic-record',
  });
  const cancelIcon = icons.del({ className: 'msgRecordSend__ic-cancel' });

  const recordProgressText = text('');
  const recordProgress = div`.msgRecordSend__progress`(recordProgressText);
  const toolTip = div`.msgRecordSend__tooltip`(
    text('Please allow access to the microphone'),
  );

  const button = div`.msgRecordSend__button.-record`(recordIcon, sendIcon);
  const cancelButton = div`.msgRecordSend__button.-cancel`(cancelIcon);
  const container = div`.msgRecordSend`(button);

  let isRecording = false;
  let recordingAllowed = true;
  let startTime = 0;

  let finishRecord = () => {};

  const updateTimer = (time: number) => {
    if (!startTime) startTime = time;

    const delta = time - startTime;

    const milisecs = `0${Math.floor(((delta % 1000) / 1000) * 60)}`.slice(-2);
    const secs = `0${Math.floor((delta / 1000) % 60)}`.slice(-2);
    const mins = `0${Math.floor(delta / 60000)}`.slice(-2);

    recordProgressText.textContent = `${mins}:${secs},${milisecs}`;
  };

  listen(button, 'click', async () => {
    if (!recordingAllowed) {
      onMessage();
      return;
    }

    if (!isRecording) {
      try {
        finishRecord = await startRecord((volume, time) => {
          button.style.boxShadow = `0 0 0 ${(volume - 128) * 2}px rgba(0,0,0,.15)`;

          updateTimer(time);
        });
        isRecording = true;
        unmount(toolTip);
        button.classList.remove('-record');
        container.classList.add('-recording');
        onStartRecording();
      } catch (error) {
        // error.name === 'NotAllowedError'
        mount(container, toolTip);
      }
      return;
    }

    isRecording = false;
    startTime = 0;
    unmount(recordProgress);
    unmount(cancelButton);
    button.classList.add('-record');
    container.classList.remove('-recording');
    onFinishRecording();

    const result = await finishRecord();

    button.style.boxShadow = 'box-shadow: 0px 1px 2px 0px rgba(16, 35, 47, 0.15)';

    onAudio(result);
  });

  listen(container, 'transitionend', () => {
    if (!container.classList.contains('-recording')) {
      return;
    }

    if (cancelButton.parentElement) {
      return;
    }

    mount(container, cancelButton, button);
    mount(container, recordProgress, cancelButton);
  });

  listen(cancelButton, 'click', async () => {
    isRecording = false;
    startTime = 0;
    unmount(recordProgress);
    unmount(cancelButton);
    button.classList.add('-record');
    container.classList.remove('-recording');
    onFinishRecording();

    await finishRecord();

    button.style.boxShadow = 'box-shadow: 0px 1px 2px 0px rgba(16, 35, 47, 0.15)';
  });

  return useInterface(container, {
    message: () => {
      recordingAllowed = false;
      button.classList.remove('-record');
    },
    audio: () => {
      recordingAllowed = true;
      button.classList.add('-record');
    },
  });
}
