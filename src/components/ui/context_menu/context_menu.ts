import { div, text } from 'core/html';
import { useOutsideEvent, useInterface } from 'core/hooks';
import { mount, listen, unmount } from 'core/dom';
import './context_menu.scss';

export type ContextMenuOption = {
  icon: (props?: any) => Node,
  label: string,
  onClick: () => void,
};

type Props = {
  className?: string,
  opened?: boolean,
  onClose?: () => void,
  options: ContextMenuOption[],
};

export default function contextMenu({ className, options, onClose }: Props) {
  const container = div`.contextMenu${className}`();

  const close = () => {
    if (onClose) onClose();
    container.classList.add('-closing');
  };

  for (let i = 0; i < options.length; i++) {
    const { icon, label, onClick } = options[i];
    const element = div`.contextMenu__item`({ onClick: () => { close(); onClick(); } },
      div`.contextMenu__icon`(icon()),
      div`.contextMenu__label`(text(label)),
    );

    mount(container, element);
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
