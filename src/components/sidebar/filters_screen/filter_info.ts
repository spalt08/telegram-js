import { BehaviorSubject } from 'rxjs';
import { div, text } from 'core/html';
import foldersSticker from 'assets/folders2.tgs';
import { textInput } from 'components/ui';
import { getInterface, useMaybeObservable, useObservable } from 'core/hooks';
import { MaybeObservable } from 'core/types';
import { mount, unmount } from 'core/dom';
import screenTgs from '../screen_tgs/screen_tgs';
import './filter_info.scss';

export default function filterInfo(isCreating: MaybeObservable<boolean>, title: BehaviorSubject<string>) {
  const titleInput = textInput({
    label: 'Folder Name',
    maxLength: 50,
    className: 'filterInfo__title',
    onChange(newTitle) {
      title.next(newTitle);
    },
  });

  useObservable(titleInput, title, true, (newTitle) => {
    getInterface(titleInput).setValue(newTitle);
  });

  let hint: HTMLElement | undefined;
  const container = (
    div`.filterInfo`(
      screenTgs({
        className: 'filterInfo__image',
        src: foldersSticker,
        loop: false,
      }),
      titleInput,
    )
  );

  useMaybeObservable(container, isCreating, true, (creating) => {
    if (creating && !hint) {
      hint = div`.filterInfo__text`(text('Choose chats and types of chats that will appear and never appear in this folder.'));
      mount(container, hint, titleInput);
    } else if (!creating && hint) {
      unmount(hint);
      hint = undefined;
    }
  });

  return container;
}
