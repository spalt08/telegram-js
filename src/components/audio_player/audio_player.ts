import { close, rewind } from 'components/icons';
import { userCache } from 'cache';
import { userToTitle } from 'cache/accessors';
import { datetime, playButton, roundButton } from 'components/ui';
import { mount, unmountChildren, listen } from 'core/dom';
import { useObservable, useToBehaviorSubject } from 'core/hooks';
import { div, span, text } from 'core/html';
import { getAttributeAudio, getAttributeFilename } from 'helpers/files';
import { Document, Message } from 'mtproto-js';
import { BehaviorSubject } from 'rxjs';
import { audio as audioService, message } from 'services';
import './audio_player.scss';

export default function audioPlayer(onVisibilityChange: (visible: boolean) => void) {
  const titleSubj = new BehaviorSubject('');
  const performerSubj = new BehaviorSubject('');
  const playButtonHolder = div`.audioPlayer__playButton`();
  const playPrev = roundButton({ className: 'audioPlayer__playPrev', onClick: () => audioService.playOlder() }, rewind());
  const playNext = roundButton({ className: 'audioPlayer__playNext', onClick: () => audioService.playNewer() }, rewind());

  useObservable(playPrev, audioService.hasOlder, true, (value) => {
    playPrev.classList.toggle('-active', value);
  });

  useObservable(playNext, audioService.hasNewer, true, (value) => {
    playNext.classList.toggle('-active', value);
  });

  const container = div`.audioPlayer`(
    playPrev,
    playButtonHolder,
    playNext,
    div`.audioPlayer__content`(
      span`.audioPlayer__title`(text(titleSubj)),
      span`.audioPlayer__performer`(text(performerSubj)),
    ),
    roundButton(
      {
        className: 'audioPlayer__close-button',
        onClick: () => audioService.stop(),
      },
      close(),
    ),
  );

  let lastAudio: { message: Message.message, doc: Document.document };

  listen(container, 'click', (e) => {
    if (e.target === e.currentTarget && lastAudio) {
      message.selectPeer(lastAudio.message.to_id, lastAudio.message.id);
    }
  });

  useObservable(container, audioService.currentAudio, true, (currAudio) => {
    onVisibilityChange(!!currAudio);
    container.classList.toggle('-hidden', !currAudio);
    if (currAudio) {
      if (!lastAudio || currAudio.doc !== lastAudio.doc) {
        unmountChildren(playButtonHolder);
        mount(playButtonHolder, playButton(currAudio.message));
        lastAudio = currAudio;
      }

      let title: string | undefined;
      let performer: string | undefined;
      const audioAttribute = getAttributeAudio(currAudio.doc);

      if (audioAttribute) {
        if (audioAttribute.voice) {
          performer = datetime({ timestamp: currAudio.message.date, full: true }).textContent ?? '';
          const user = userCache.get(currAudio.message.from_id!);
          title = userToTitle(user);
        } else if (audioAttribute.performer && audioAttribute.title) {
          title = audioAttribute.title;
          performer = audioAttribute.performer;
        } else {
          title = audioAttribute.title ?? audioAttribute.performer;
        }
      }
      if (!title) {
        const filenameAttribute = getAttributeFilename(currAudio.doc);
        if (filenameAttribute) {
          title = filenameAttribute.file_name;
        }
      }

      titleSubj.next(title ?? '');
      performerSubj.next(performer ?? '');
    }
  });

  return container;
}
