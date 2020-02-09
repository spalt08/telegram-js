import { div, text } from 'core/html';
import { MaybeObservable } from 'core/types';
import { useMaybeObservable } from 'core/hooks';
import './info_list_item.scss';
import ripple from '../ripple/ripple';

export default function infoListItem(icon: SVGSVGElement, label: string, value: MaybeObservable<string>) {
  const container = div`.infoListItem.hidden`(
    div`.infoListItem__icon`(icon),
    div`.infoListItem__content`(
      div`.infoListItem__value`(text(value)),
      div`.infoListItem__label`(text(label)),
    ),
  );

  useMaybeObservable(container, value, (newValue) => {
    container.classList.toggle('hidden', !newValue);
  });
  return ripple({}, [container]);
}
