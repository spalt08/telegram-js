import { div, text, span } from 'core/html';
import { MaybeObservable } from 'core/types';
import { useMaybeObservable } from 'core/hooks';
import { mount, unmountChildren } from 'core/dom';
import { highlightLinks } from '../formatted_message';
import ripple from '../ripple/ripple';
import './info_list_item.scss';

export default function infoListItem(base: Node, icon: SVGSVGElement, label: string, value: MaybeObservable<string>) {
  const valueEl = span();
  const container = div`.infoListItem.hidden`(
    div`.infoListItem__icon`(icon),
    div`.infoListItem__content`(
      div`.infoListItem__value`(valueEl),
      div`.infoListItem__label`(text(label)),
    ),
  );

  useMaybeObservable(base, value, (val) => {
    unmountChildren(valueEl);
    mount(valueEl, highlightLinks(val));
  });

  useMaybeObservable(container, value, (newValue) => {
    container.classList.toggle('hidden', !newValue);
  });
  return ripple({}, [container]);
}
