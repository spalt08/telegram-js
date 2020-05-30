
import { BehaviorSubject } from 'rxjs';
import { div } from 'core/html';
import { useObservable, getInterface } from 'core/hooks';
import { main, message } from 'services';
import sidebar from 'components/sidebar/sidebar';
import { withContextMenu } from 'components/global_context_menu';
import history from './main/history';
import './home.scss';

/**
 * Handler for route /
 */
export default function home() {
  const isChatOpened = new BehaviorSubject(false);

  const leftSidebar = sidebar({ initial: 'dialogs', className: '-left' });
  const rightSidebar = sidebar({ className: '-right -hidden' });
  const historyEl = history({
    onBackToContacts: () => isChatOpened.next(false),
  });

  const container = div`.home`(
    leftSidebar,
    historyEl,
    rightSidebar,
  );

  useObservable(container, main.rightSidebarDelegate, (state) => {
    if (state) getInterface(rightSidebar).pushState(state);
  });

  useObservable(container, message.activePeer, (peer) => {
    if (peer !== null) isChatOpened.next(true);
  });

  useObservable(container, isChatOpened, (opened) => {
    leftSidebar.classList.toggle('hidden', opened);
    historyEl.classList.toggle('visible', opened);
  });

  return withContextMenu(container);
}
