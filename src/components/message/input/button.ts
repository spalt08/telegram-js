import AudioRecorder from 'audio-recorder-polyfill';
import { div, text } from 'core/html';
import * as icons from 'components/icons';
import './button.scss';
import { useInterface } from 'core/hooks';
import { listen, mount, unmount } from 'core/dom';
import { upload } from 'client/media';

type Props = {
  onMessage: () => void,
  onAudio: (file, meta) => void,
};

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
  const toolTip = div`.msgRecordSend__tooltip`(text(
    'Please allow access to the microphone',
  ));

  const button = div`.msgRecordSend__button.-record`(recordIcon, sendIcon);
  const cancelButton = div`.msgRecordSend__button.-cancel`(cancelIcon);
  const container = div`.msgRecordSend`(button);

  let isRecording = false;
  let recordingAllowed = true;
  let startTime = 0;

  let needSend = false;
  let recorder = null;
  let duration = 0;

  const updateTimer = (time: number) => {
    if (!isRecording) return;
    if (!startTime) startTime = time;

    const delta = time - startTime;
    duration = Math.floor((delta / 1000) % 60);

    const milisecs = `0${Math.floor(((delta % 1000) / 1000) * 60)}`.slice(-2);
    const secs = `0${duration}`.slice(-2);
    const mins = `0${Math.floor(delta / 60000)}`.slice(-2);

    recordProgressText.textContent = `${mins}:${secs},${milisecs}`;

    requestAnimationFrame(updateTimer);
  };

  listen(button, 'click', () => {
    if (!recordingAllowed) {
      onMessage();
      return;
    }

    if (!isRecording) {
      // eslint-disable-next-line compat/compat
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          isRecording = true;
          unmount(toolTip);
          button.classList.remove('-record');
          container.classList.add('-recording');
          requestAnimationFrame(updateTimer);
          onStartRecording();

          recorder = new AudioRecorder(stream);

          recorder.addEventListener('dataavailable', (event) => {
            if (!needSend) {
              return;
            }

            needSend = false;

            upload(event.data, (result) => {
              onAudio(result, {
                mimeType: event.data.type,
                duration,
              });
            });
          });

          recorder.start();
        })
        .catch(() => mount(container, toolTip));

      return;
    }

    needSend = true;

    isRecording = false;
    startTime = 0;
    unmount(recordProgress);
    unmount(cancelButton);
    button.classList.add('-record');
    container.classList.remove('-recording');
    onFinishRecording();

    recorder.stop();
    recorder.stream.getTracks().forEach((track) => track.stop());
  });

  listen(container, 'transitionend', () => {
    if (!container.classList.contains('-recording') || cancelButton.parentElement) return;

    mount(container, cancelButton, button);
    mount(container, recordProgress, cancelButton);
  });

  listen(cancelButton, 'click', () => {
    isRecording = false;
    startTime = 0;
    unmount(recordProgress);
    unmount(cancelButton);
    button.classList.add('-record');
    container.classList.remove('-recording');
    onFinishRecording();

    recorder.stop();
    recorder.stream.getTracks().forEach((track) => track.stop());
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
