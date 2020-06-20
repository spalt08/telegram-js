import { getInterface } from 'core/hooks';
import { listen, mount } from 'core/dom';
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

/**
 * Hook for clickable element
 */
export function useContextMenu(element: Element, options: ContextMenuOption[]) {
  listen(element, 'contextmenu', (event: MouseEvent) => {
    if (menu) getInterface(menu).close();

    menu = contextMenu({ className: 'global', options });
    if (container) mount(container, menu);

    const x = event.pageX;
    const y = event.pageY;

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

    event.preventDefault();
  });
}
