import { main } from 'services';
import { getInterface } from 'core/hooks';
import { unmount, listen, mount, animationFrameStart } from 'core/dom';
import { contextMenu, ContextMenuOption } from './ui';

let menuContainer: Node | undefined;
let shouldClose = false;
let vw = window.innerWidth;
let vh = window.innerHeight;

window.addEventListener('resize', () => {
  vw = window.innerWidth;
  vh = window.innerHeight;
});

const menu = contextMenu({ className: 'global', options: main.contextMenuDelegate, onClose: () => shouldClose = true });
const IMenu = getInterface(menu);

/**
 * Unmount on close to prevent redundant window outside events
 */
listen(menu, 'transitionend', () => {
  if (shouldClose) unmount(menu);
});

/**
 * Enhancer for root element
 */
export function withContextMenu(container: Node) {
  return menuContainer = container;
}

/**
 * Hook for clickable element
 */
export function useContextMenu(container: Node, deledate: ContextMenuOption[]) {
  listen(container, 'contextmenu', (event: MouseEvent) => {
    main.contextMenuDelegate.next(deledate);

    if (menuContainer && !menu.parentElement) mount(menuContainer, menu);

    // const rect = menu.getBoundingClientRect();
    const mw = 220;
    const mh = deledate.length * 56;
    let origin = 'left';

    if (event.pageX + mw > vw) {
      menu.style.left = `${event.pageX - mw}px`;
      origin = 'right';
    } else {
      menu.style.left = `${event.pageX}px`;
      origin = 'left';
    }

    if (event.pageY + mh > vh) {
      menu.style.top = `${event.pageY - mh}px`;
      origin += ' bottom';
    } else {
      menu.style.top = `${event.pageY}px`;
      origin += ' top';
    }

    menu.style.transformOrigin = origin;
    shouldClose = false;

    const selection = getSelection();
    if (selection) selection.empty();

    animationFrameStart().then(IMenu.open);

    event.preventDefault();
  });
}
