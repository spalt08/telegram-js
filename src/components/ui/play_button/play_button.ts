import { pause, play } from 'components/icons';
import { listen } from 'core/dom';
import { useMaybeObservable, useMaybeObservableMaybeObservable } from 'core/hooks';
import { div } from 'core/html';
import { MaybeObservable } from 'core/types';
import { Message } from 'mtproto-js';
import { audio } from 'services';
import { MediaPlaybackStatus } from 'services/audio';
import ripple from '../ripple/ripple';
import './play_button.scss';

export default function playButton(message: MaybeObservable<Message.message>) {
  const playButtonSvg = play({ class: 'play' });
  const pauseButtonSvg = pause({ class: 'pause hidden' });
  let currStatus: MediaPlaybackStatus = MediaPlaybackStatus.Stopped;
  let currMessage: Message.message | undefined;

  const container = div`.playButton`(ripple({ className: 'playButton__ripple' }, [playButtonSvg, pauseButtonSvg]));

  const setStatus = (status: MediaPlaybackStatus) => {
    if (currStatus !== status) {
      currStatus = status;
      playButtonSvg.classList.toggle('hidden', status !== MediaPlaybackStatus.Stopped);
      pauseButtonSvg.classList.toggle('hidden', status !== MediaPlaybackStatus.Playing);
    }
  };

  useMaybeObservable(container, message, true, (newMessage) => {
    currMessage = newMessage;
  });

  listen(container, 'click', () => {
    if (currMessage) {
      if (currStatus === MediaPlaybackStatus.Playing) {
        audio.pause();
      } else {
        audio.play(currMessage);
      }
    }
  });

  useMaybeObservableMaybeObservable(
    container,
    message,
    (newMessage) => audio.audioInfo(newMessage),
    true,
    (info) => setStatus(info.status));

  return container;
}
