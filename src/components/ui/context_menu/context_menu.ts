import { div, text, input, nothing } from 'core/html';
import { MaybeObservable } from 'core/types';
import { useMaybeObservable, useOutsideEvent, useInterface } from 'core/hooks';
import { mount, unmountChildren } from 'core/dom';
import './context_menu.scss';

export type ContextMenuOption = {
  icon: (props?: any) => Node,
  label: string,
  onClick?: () => void,
  onFile?: (event: Event) => void,
};

type Props = {
  className?: string,
  opened?: boolean,
  onClose?: () => void,
  options: MaybeObservable<ContextMenuOption[]>,
};

export default function contextMenu({ className, options, onClose, opened = false }: Props) {
  const container = div`.contextMenu${className}`();
  let mounted: Node[] = [];

  const open = () => container.classList.add('-opened');
  const close = (event?: MouseEvent | any) => {
    container.classList.remove('-opened');
    if (onClose) onClose();
    if (event && event.preventDefault) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  const toggle = () => {
    if (container.classList.contains('-opened')) close();
    else open();
  };

  useMaybeObservable(container, options, (items) => {
    unmountChildren(container);
    mounted = [];

    for (let i = 0; i < items.length; i++) {
      const { icon, label, onClick, onFile } = items[i];
      const element = div`.contextMenu__item`({ onClick: onClick ? () => { close(); onClick(); } : undefined },
        div`.contextMenu__icon`(icon()),
        div`.contextMenu__label`(text(label)),
        onFile ? (
          input({ className: 'contextMenu__file', type: 'file', multiple: true, onChange: (event: Event) => { close(); onFile(event); } })
        ) : nothing,
      );

      mount(container, element);
      mounted.push(element);
    }
  });

  useOutsideEvent(container, 'click', close);

  if (opened) open();

  return useInterface(container, { close, open, toggle });
}
