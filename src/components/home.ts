import { handleStickerRendering } from 'components/media/sticker/player';
import sidebar from 'components/sidebar/sidebar';
import { preloadResources as preloadBubbleResources } from 'components/ui/bubble/bubble';
import { listen, animationFrameStart } from 'core/dom';
import { getInterface, useObservable, useListenWhileMounted, useOnMount } from 'core/hooks';
import { div } from 'core/html';
import { main, message } from 'services';
import readSrc from 'assets/statuses/read@2x.png';
import unreadSrc from 'assets/statuses/unread@2x.png';
import { preloadImage } from 'helpers/other';
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

  // fix for virtual keyboard in iOS.
  const { visualViewport } = window as any;
  if (visualViewport) {
    useListenWhileMounted(container, visualViewport, 'resize', () => {
      container.style.transform = `translateY(${visualViewport.pageTop}px)`;
      container.style.height = `${visualViewport.height}px`;
      // in some cases we must update scrollTop position,
      // even though it is already equal to visualViewport.pageTop
      // This is probably some bug in Safari.
      document.documentElement.scrollTop = visualViewport.pageTop;
    });
  }

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

  useOnMount(container, () => {
    setTimeout(() => {
      preloadBubbleResources();
      preloadImage(readSrc);
      preloadImage(unreadSrc);
    }, 100);
  });

  // window.history.pushState(null, '', document.location.href);
  // window.onpopstate = () => {
  //   if (main.isChatOpened.value) main.isChatOpened.next(false);
  //   leftSidebarFade.style.display = '';
  //   window.history.go(1);
  // };

  return container;
}
