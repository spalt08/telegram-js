import { userCache } from 'cache';
import { userToTitle } from 'cache/accessors';
import { datetime, playButton } from 'components/ui';
import { mount, unmountChildren } from 'core/dom';
import { useObservable } from 'core/hooks';
import { div, span, text } from 'core/html';
import { getAttributeAudio, getAttributeFilename } from 'helpers/files';
import { Document } from 'mtproto-js';
import { BehaviorSubject } from 'rxjs';
import { audio as audioService } from 'services';
import './audio_player.scss';

export default function audioPlayer(onVisibilityChange: (visible: boolean) => void) {
  const titleSubj = new BehaviorSubject('');
  const performerSubj = new BehaviorSubject('');
  const playButtonHolder = div`.audioPlayer__playButton`();
  const container = div`.audioPlayer`(
    playButtonHolder,
    div`.audioPlayer__content`(
      span`.audioPlayer__title`(text(titleSubj)),
      span`.audioPlayer__performer`(text(performerSubj)),
    ),
  );

  let lastDoc: Document.document;
  useObservable(container, audioService.currentAudio, true, (currAudio) => {
    onVisibilityChange(currAudio);
    container.classList.toggle('-hidden', !currAudio);
    if (currAudio) {
      if (currAudio.doc !== lastDoc) {
        unmountChildren(playButtonHolder);
        mount(playButtonHolder, playButton(currAudio.message));
        lastDoc = currAudio.doc;
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
