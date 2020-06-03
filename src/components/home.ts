
import { withContextMenu } from 'components/global_context_menu';
import sidebar from 'components/sidebar/sidebar';
import { listen } from 'core/dom';
import { getInterface, useObservable } from 'core/hooks';
import { div } from 'core/html';
import { BehaviorSubject } from 'rxjs';
import { main, message } from 'services';
import './home.scss';
import history from './main/history';

/**
 * Handler for route /
 */
export default function home() {
  const isChatOpened = new BehaviorSubject<boolean | null>(null);

  const leftSidebarFade = div`.home__left-sidebar-fade`();
  const rightSidebarFade = div`.home__right-sidebar-fade`();

  const historyEl = history({
    onBackToContacts: () => isChatOpened.next(false),
  });
  const leftSidebar = sidebar({ initial: 'dialogs', className: '-left' });
  const rightSidebar = sidebar({
    className: '-right -hidden',
    onTransitionStart: (opened) => {
      historyEl.classList.toggle('-popping', opened);

      rightSidebarFade.style.display = 'block';
      requestAnimationFrame(() => rightSidebarFade.classList.toggle('-opening', opened));
    },
  });

  const container = div`.home`(
    leftSidebar,
    historyEl,
    rightSidebar,
    leftSidebarFade,
    rightSidebarFade,
  );

  useObservable(container, main.rightSidebarDelegate, (state) => {
    if (state) getInterface(rightSidebar).pushState(state);
  });

  useObservable(container, message.activePeer, (peer) => {
    if (peer !== null) isChatOpened.next(true);
  });

  useObservable(container, isChatOpened, (opened) => {
    if (opened !== null) {
      leftSidebar.classList.toggle('-popping', opened);
      historyEl.classList.toggle('-visible', opened);

      leftSidebarFade.style.display = 'block';
      requestAnimationFrame(() => leftSidebarFade.classList.toggle('-opening', opened));
    }
  });

  listen(leftSidebarFade, 'transitionend', () => {
    leftSidebarFade.style.display = '';
  });

  listen(rightSidebarFade, 'transitionend', () => {
    rightSidebarFade.style.display = '';
  });

  return withContextMenu(container);
}
