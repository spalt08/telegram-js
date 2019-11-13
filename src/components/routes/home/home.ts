import { div, text } from 'core/html';
import { dialogs } from 'services';
import './home.scss';
import { mount } from 'core/dom';
import { Dialog } from 'cache/types';
import dialogPreview from './dialog/dialog';

/**
 * Handler for route /
 */
export default function home() {
  // fetch dialogs
  dialogs.getDialogs();

  const sidebar = div`.home__sidebar`();

  // todo changable list
  dialogs.dialogs.subscribe((items: Dialog[]) => {
    for (let i = 0; i < items.length; i += 1) {
      mount(sidebar, dialogPreview(items[i]));
    }
  });

  return div`.home`(
    sidebar,
    div`.home__content`(
      text('Content'),
    ),
  );
}
