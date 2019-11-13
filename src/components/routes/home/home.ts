import { div, text } from 'core/html';
import { dialogs } from 'services';
import { mount } from 'core/dom';
import { useObservable } from 'core/hooks';
import dialogPreview from './dialog/dialog';
import './home.scss';

/**
 * Handler for route /
 */
export default function home() {
  // fetch dialogs
  dialogs.getDialogs();

  const sidebar = div`.home__sidebar`();
  const element = div`.home`(
    sidebar,
    div`.home__content`(
      text('Content'),
    ),
  );

  // todo changable list
  useObservable(element, dialogs.dialogs, (items) => {
    for (let i = 0; i < items.length; i += 1) {
      mount(sidebar, dialogPreview(items[i]));
    }
  });

  return element;
}
