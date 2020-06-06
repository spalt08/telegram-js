import { div, text } from 'core/html';
import * as icons from 'components/icons';
import { useInterface } from 'core/hooks';
import { listen, mount, unmount } from 'core/dom';
import loadAudioRecorder from '../../../lazy-modules/audio-recoder';
import './button.scss';

type Props = {
  onMessage: () => void,
  onAudio: () => void,
};

function prepareWaveform(waveform) {
  const bytes = new Uint8Array(63);

  const step = Math.floor(waveform.length / 63);

  bytes.forEach((_value, i) => {
    bytes[i] = waveform[i * step];
  });

  return bytes.buffer;
}

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

function startAnalyze(stream, handler) {
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

async function startRecord(handler) {
  const chunks = [];
  const waveform = [];
  const recordStartTime = Date.now();

  const { stream, finishStream } = await startStream();

  const finishAnalyze = startAnalyze(stream, (volume, time) => {
    // console.log(`${volume} / ${Math.floor(time)}`);

    waveform.push((volume - 128) * 2);
    handler(volume, time);
  });

  const AudioRecorder = await loadAudioRecorder();

  const audioRecorder = new AudioRecorder(stream);
  audioRecorder.start();

  let handleData = () => {};

  audioRecorder.addEventListener('dataavailable', (event) => {
    chunks.push(event.data);

    handleData();
  });

  return () => {
    return new Promise((resolve, reject) => {
      handleData = () => {
        resolve({
          blob: new Blob(chunks, {
            type: 'audio/mpeg',
          }),
          duration: Math.round((Date.now() - recordStartTime) / 1000),
          waveform: prepareWaveform(waveform),
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
  const recordIcon = icons.microphone({
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
          // button.style.boxShadow = `0 0 0 ${volume / 2}px rgba(0,0,0,.15)`;

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
