import { handleStickerRendering } from 'components/media/sticker/player';
import sidebar from 'components/sidebar/sidebar';
import { listen, animationFrameStart } from 'core/dom';
import { getInterface, useObservable } from 'core/hooks';
import { div } from 'core/html';
import { main, message } from 'services';
import './home.scss';
import history from './main/history';

/**
 * Handler for route /
 */
export default function home() {
  const leftSidebarFade = div`.home__left-sidebar-fade`();
  const rightSidebarFade = div`.home__right-sidebar-fade`();

  const historyEl = history({
    onBackToContacts: () => main.isChatOpened.next(false),
  });
  const leftSidebar = sidebar({ initial: { state: 'dialogs', ctx: undefined }, className: '-left' });
  const rightSidebar = sidebar({
    className: '-right -hidden',
    onTransitionStart: (opened) => {
      historyEl.classList.toggle('-popping', opened);

      if (opened) rightSidebarFade.style.display = 'block';
      else rightSidebarFade.style.display = '';

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

  useObservable(container, message.activePeer, true, (next) => {
    if (next) getInterface(rightSidebar).clear();
    if (historyEl.classList.contains('-right-sidebar')) {
      const historyList = historyEl.querySelector('.history__list');

      if (historyList instanceof HTMLElement) historyList.style.transition = 'none';
      historyEl.style.transition = 'none';
      historyEl.classList.remove('-right-sidebar');

      animationFrameStart().then(() => {
        historyEl.style.transition = '';
        if (historyList instanceof HTMLElement) historyList.style.transition = '';
      });
    }
  });

  useObservable(container, main.rightSidebarDelegate, false, (stateAndCtx) => {
    const sidebarInterface = getInterface(rightSidebar);
    historyEl.classList.toggle('-right-sidebar', !!stateAndCtx);
    if (stateAndCtx) sidebarInterface.pushState(stateAndCtx.state, stateAndCtx.ctx);
    else sidebarInterface.close();
  });

  useObservable(container, main.isChatOpened, true, (opened) => {
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

  requestAnimationFrame(handleStickerRendering);

  window.history.pushState(null, '', document.location.href);
  window.onpopstate = () => {
    if (main.isChatOpened.value) main.isChatOpened.next(false);
    leftSidebarFade.style.display = '';
    window.history.go(1);
  };

  return container;
}
