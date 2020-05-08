import { div, text } from 'core/html';
import * as icons from 'components/icons';
import './button.scss';
import { useInterface } from 'core/hooks';
import { listen, mount, unmount } from 'core/dom';

type Props = {
  onMessage: () => void,
  onAudio: () => void,
};

export default function recordSendButton({ onMessage, onAudio }: Props) {
  const sendIcon = icons.send({ className: 'msgRecordSend__ic-send' });
  const recordIcon = icons.microphone({ className: 'msgRecordSend__ic-record' });
  const cancelIcon = icons.del({ className: 'msgRecordSend__ic-cancel' });

  const recordProgressText = text('');
  const recordProgress = div`.msgRecordSend__progress`(recordProgressText);
  const toolTip = div`.msgRecordSend__tooltip`(text('Please allow access to the microphone'));

  const button = div`.msgRecordSend__button.-record`(recordIcon, sendIcon);
  const cancelButton = div`.msgRecordSend__button.-cancel`(cancelIcon);
  const container = div`.msgRecordSend`(button);

  let isRecording = false;
  let recordingAllowed = true;
  let startTime = 0;

  const updateTimer = (time: number) => {
    if (!isRecording) return;
    if (!startTime) startTime = time;

    const delta = time - startTime;
    const milisecs = `0${Math.floor(((delta % 1000) / 1000) * 60)}`.slice(-2);
    const secs = `0${Math.floor((delta / 1000) % 60)}`.slice(-2);
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
        .then(() => {
          isRecording = true;
          mount(container, cancelButton, button);
          mount(container, recordProgress, cancelButton);
          unmount(toolTip);
          button.classList.remove('-record');
          requestAnimationFrame(updateTimer);

          // todo handle stream
        })
        .catch(() => mount(container, toolTip));

      return;
    }

    onAudio();
  });

  listen(cancelButton, 'click', () => {
    isRecording = false;
    startTime = 0;
    unmount(cancelButton);
    unmount(recordProgress);
    button.classList.add('-record');
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
