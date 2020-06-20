import { getInterface } from 'core/hooks';
import { listen, mount } from 'core/dom';
import { isSafari, isAndroid } from 'helpers/browser';
import { contextMenu, ContextMenuOption } from './ui';

let container: Node | undefined;
let menu: ReturnType<typeof contextMenu> | undefined;
let vw = window.innerWidth;
let vh = window.innerHeight;

window.addEventListener('resize', () => {
  vw = window.innerWidth;
  vh = window.innerHeight;
});

/**
 * Enhancer for root element
 */
export function withContextMenu(element: Node) {
  return container = element;
}

function openMenu(x: number, y: number, options: ContextMenuOption[]) {
  if (menu) getInterface(menu).close();

  menu = contextMenu({ className: 'global', options });
  if (container) mount(container, menu);

  const mw = 220;
  const mh = options.length * 56;
  let origin = 'left';

  if (x + mw > vw) {
    menu.style.left = `${x - mw}px`;
    origin = 'right';
  } else {
    menu.style.left = `${x}px`;
    origin = 'left';
  }

  if (y + mh > vh) {
    menu.style.top = `${y - mh}px`;
    origin += ' bottom';
  } else {
    menu.style.top = `${y}px`;
    origin += ' top';
  }

  menu.style.transformOrigin = origin;

  const selection = getSelection();
  if (selection) selection.empty();
}

let touchTimer: any;

/**
 * Hook for clickable element
 */
export function useContextMenu(element: Element, options: ContextMenuOption[]) {
  listen(element, 'contextmenu', (event: MouseEvent) => {
    const x = event.pageX;
    const y = event.pageY;

    openMenu(x, y, options);
    event.preventDefault();
  });

  if (isSafari || isAndroid) {
    listen(element, 'touchstart', (event: TouchEvent) => {
      if (event.touches.length > 1) return;
      const touch = event.touches[0];
      touchTimer = setTimeout(() => openMenu(touch.pageX, touch.pageY, options), 1000);
    });

    listen(element, 'touchmove', () => touchTimer && clearTimeout(touchTimer));
    listen(element, 'touchend', () => touchTimer && clearTimeout(touchTimer));
    listen(element, 'touchcancel', () => touchTimer && clearTimeout(touchTimer));
  }
}
