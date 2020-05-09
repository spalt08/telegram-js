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
export function useContextMenu(element: Node, options: ContextMenuOption[]) {
  listen(element, 'contextmenu', (event: MouseEvent) => {
    if (menu) getInterface(menu).close();

    menu = contextMenu({ className: 'global', options });
    if (container) mount(container, menu);

    // const rect = menu.getBoundingClientRect();
    const mw = 220;
    const mh = options.length * 56;
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

    const selection = getSelection();
    if (selection) selection.empty();

    event.preventDefault();
  });
}
