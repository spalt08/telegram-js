import { div, span, text } from 'core/html';
import { useOutsideEvent, useInterface, useMaybeObservable } from 'core/hooks';
import { mount, listen, unmount } from 'core/dom';
import { MaybeObservable } from 'core/types';
import './context_menu.scss';

export type ContextMenuBadge = {
  text: string,
  highlight?: boolean,
};

export type ContextMenuOption = {
  icon: (props?: any) => Node,
  label: string,
  color?: 'accent' | 'danger',
  badge?: MaybeObservable<ContextMenuBadge | undefined>,
  onClick: () => void,
};

type Props = {
  className?: string,
  opened?: boolean,
  onClose?: () => void,
  options: ContextMenuOption[],
};

function contextMenuOption({ icon, label, color, badge, onClick }: ContextMenuOption) {
  const element = div`.contextMenu__item`({ onClick },
    div`.contextMenu__icon`(icon()),
    div`.contextMenu__label`(text(label)),
  );

  if (color) {
    element.classList.add(`-${color}`);
  }

  let badgeEl: HTMLElement | undefined;

  useMaybeObservable(element, badge, false, (currentBadge) => {
    if (currentBadge) {
      if (!badgeEl) {
        badgeEl = span`.contextMenu__badge`();
        mount(element, badgeEl);
      }
      badgeEl.textContent = currentBadge.text;
      badgeEl.classList.toggle('-highlight', !!currentBadge.highlight);
    } else if (badgeEl) {
      unmount(badgeEl);
      badgeEl = undefined;
    }
  });

  return element;
}

export default function contextMenu({ className, options, onClose }: Props) {
  const container = div`.contextMenu${className}`();

  const close = () => {
    if (!container.parentElement) return;

    if (onClose) onClose();
    container.classList.add('-closing');
  };

  for (let i = 0; i < options.length; i++) {
    const { onClick, ...option } = options[i];
    mount(container, contextMenuOption({
      ...option,
      onClick: () => {
        close();
        onClick();
      },
    }));
  }

  useOutsideEvent(container, 'click', close);

  listen(container, 'transitionend', () => {
    if (container.classList.contains('-closing')) {
      unmount(container);
      container.classList.remove('-closing');
    }
  });

  return useInterface(container, { close });
}
