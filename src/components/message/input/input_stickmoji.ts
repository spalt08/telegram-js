/* eslint-disable no-param-reassign */
import emojiPanel from 'components/media/emoji/panel';
import stickerPanel from 'components/media/sticker/panel';
import gifsPanel from 'components/media/video/gif_panel';
import './input_stickmoji.scss';
import { listen, mount, animationFrameStart, listenOnce, unmount } from 'core/dom';
import { Document } from 'mtproto-js';
import { div } from 'core/html';
import * as icons from 'components/icons';
import { useOutsideEvent } from 'core/hooks';
import { main } from 'services';

type Props = {
  onSelectEmoji: (emoji: string) => void,
  onSelectSticker: (sticker: Document) => void,
  onClose: () => void,
};

export default function stickMojiPanel({ onSelectEmoji, onSelectSticker, onClose }: Props) {
  let panelContainer: HTMLDivElement;
  let activePanelIndex: number;
  let nextPanelIndex: number | undefined;
  let dragX: number | undefined;
  let dragY: number | undefined;
  let isLocked = false;

  const panels = [
    emojiPanel(onSelectEmoji),
    stickerPanel(onSelectSticker),
    gifsPanel(),
  ];

  const tabs = [
    icons.smile({ className: 'stickmoji-panel__icon -active' }),
    icons.stickers({ className: 'stickmoji-panel__icon' }),
    icons.gifs({ className: 'stickmoji-panel__icon' }),
  ];

  const searchIcon = div`.stickmoji-panel__search`(icons.search({ className: 'stickmoji-panel__icon' }));

  const container = div`.stickmoji-panel`(
    panelContainer = div`.stickmoji-panel__panel`(
      panels[activePanelIndex = 0],
    ),
    div`.stickmoji-panel__tabs`(
      searchIcon,
      ...tabs.map((tab) => div`.stickmoji-panel__tab`(tab)),
    ),
  );

  const startTransition = () => {
    if (isLocked) return;
    if (nextPanelIndex === undefined || nextPanelIndex === activePanelIndex) return;

    const direction = nextPanelIndex > activePanelIndex ? -1 : 1;

    if (!panels[nextPanelIndex].parentElement) {
      panels[nextPanelIndex].classList.add('stickmoji-panel__oncoming');

      if (direction > 0) panels[nextPanelIndex].style.left = '-100%';
      else panels[nextPanelIndex].style.right = '-100%';

      mount(panelContainer, panels[nextPanelIndex]);

      isLocked = true;
    }
  };

  const cancelTransition = () => {
    if (nextPanelIndex === undefined) return;

    unmount(panels[nextPanelIndex]);
    panels[nextPanelIndex].classList.remove('stickmoji-panel__oncoming');
    panels[nextPanelIndex].setAttribute('style', '');

    isLocked = false;
  };

  const finishTransition = () => {
    dragX = undefined;

    if (nextPanelIndex === undefined || nextPanelIndex === activePanelIndex) return;

    panels[nextPanelIndex].style.transition = 'transform .3s ease-out';
    panels[activePanelIndex].style.transition = 'transform .3s ease-out';

    const direction = nextPanelIndex > activePanelIndex ? -1 : 1;

    animationFrameStart().then(() => {
      if (nextPanelIndex === undefined) return;

      panels[activePanelIndex].style.transform = `translate(${direction * 100}%)`;
      panels[nextPanelIndex].style.transform = `translate(${direction * 100}%)`;
    });

    listenOnce(panels[nextPanelIndex], 'transitionend', () => {
      if (nextPanelIndex === undefined) return;

      unmount(panels[activePanelIndex]);
      tabs[activePanelIndex].classList.remove('-active');

      panels[nextPanelIndex].classList.remove('stickmoji-panel__oncoming');
      panels[nextPanelIndex].setAttribute('style', '');
      panels[activePanelIndex].setAttribute('style', '');
      tabs[nextPanelIndex].classList.add('-active');

      activePanelIndex = nextPanelIndex;
      nextPanelIndex = undefined;

      if (activePanelIndex > 0) searchIcon.style.display = 'flex';
      else searchIcon.style.display = '';

      isLocked = false;
    });
  };

  listen(panelContainer, 'touchstart', (event: TouchEvent) => {
    if (isLocked) return;

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      dragX = touch.clientX;
      dragY = touch.clientY;
    }
  });

  listen(panelContainer, 'touchmove', (event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch || !dragX || !dragY) return;

    let indexCandidate;
    const dx = touch.clientX - dragX;
    const dy = touch.clientY - dragY;

    if (Math.abs(dx) < Math.abs(dy) * 2) {
      dragX = undefined;
      return;
    }

    if (dx > 0 && activePanelIndex > 0) indexCandidate = activePanelIndex - 1;
    if (dx < 0 && activePanelIndex < panels.length - 1) indexCandidate = activePanelIndex + 1;

    if (nextPanelIndex && indexCandidate !== undefined && nextPanelIndex !== indexCandidate) cancelTransition();

    if (indexCandidate !== undefined) {
      nextPanelIndex = indexCandidate;
      startTransition();

      panels[activePanelIndex].style.transform = `translateX(${dx}px)`;
      panels[nextPanelIndex].style.transform = `translateX(${dx}px)`;
    } else if (nextPanelIndex) cancelTransition();
  });

  listen(panelContainer, 'touchend', finishTransition);
  listen(panelContainer, 'touchcancel', finishTransition);

  const clickHandler = (index: number) => {
    if (isLocked || index === activePanelIndex) return;

    nextPanelIndex = index;
    startTransition();
    finishTransition();
  };

  for (let i = 0; i < tabs.length; i++) {
    listen(tabs[i].parentElement!, 'click', () => clickHandler(i));
  }

  // listen(panelContainer, 'wheel', (event: WheelEvent) => {
  //   event.preventDefault();

  //   if (isLocked) return;

  //   const { deltaX, deltaY } = event;

  //   if (Math.abs(deltaX) > 20 && Math.abs(deltaY) <= 2) {
  //     let indexCandidate;

  //     if (deltaX < 0 && activePanelIndex > 0) indexCandidate = activePanelIndex - 1;
  //     if (deltaX > 0 && activePanelIndex < panels.length - 1) indexCandidate = activePanelIndex + 1;

  //     if (indexCandidate !== undefined) {
  //       nextPanelIndex = indexCandidate;
  //       startTransition();
  //       finishTransition();
  //     }
  //   }
  // });

  listen(container, 'transitionend', () => {
    if (container.classList.contains('-closing')) unmount(container);
  });

  useOutsideEvent(container, 'click', () => {
    container.classList.add('-closing');
    onClose();
  });

  listen(searchIcon, 'click', () => {
    if (activePanelIndex === 1) main.openSidebar('searchStickers');
  });

  return container;
}
