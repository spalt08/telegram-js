import { div, text } from 'core/html';
import { dialog } from 'services';
import { mount } from 'core/dom';
import { useObservable } from 'core/hooks';
import dialogPreview from './dialog/dialog';
import './home.scss';
import messages from './messages';

/**
 * Handler for route /
 */
export default function home() {
  // fetch dialogs
  dialog.getDialogs();

  const sidebar = div`.home__sidebar`();
  const element = div`.home`(
    sidebar,
    div`.home__content`(
      messages(),
    ),
  );

  // todo changable list
  useObservable(element, dialog.dialogs, (items) => {
    for (let i = 0; i < items.length; i += 1) {
      mount(sidebar, dialogPreview(items[i]));
    }
  });

  return element;
}
