import { asyncScheduler } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { div } from 'core/html';
import { dialog } from 'services';
import { mount, unmount } from 'core/dom';
import { useObservable } from 'core/hooks';
import dialogPreview from './dialog/dialog';
import messages from './messages';
import './home.scss';

/**
 * Handler for route /
 */
export default function home() {
  // fetch dialogs
  dialog.updateDialogs();

  const sidebar = div`.home__sidebar`();
  const element = div`.home`(
    sidebar,
    div`.home__content`(
      messages(),
    ),
  );

  // todo changable list
  useObservable(element, dialog.dialogs.pipe(throttleTime(100, asyncScheduler, { leading: false, trailing: true })), (items) => {
    while (sidebar.lastChild) {
      unmount(sidebar.lastChild);
    }
    for (let i = 0; i < items.length; i += 1) {
      mount(sidebar, dialogPreview(items[i]));
    }
  });

  return element;
}
