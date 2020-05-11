import { div, text } from 'core/html';
import { MaybeObservable } from 'core/types';
import { useMaybeObservable } from 'core/hooks';
import { mount, unmountChildren } from 'core/dom';
import { highlightLinks } from '../formatted_message';
import ripple from '../ripple/ripple';
import './info_list_item.scss';

type Props = {
  icon: () => SVGSVGElement,
  label: string,
  value: MaybeObservable<string>,
};

export default function infoListItem({ icon, label, value }: Props) {
  const valueContainer = div`.infoListItem__value`();

  const container = div`.infoListItem`(
    div`.infoListItem__icon`(icon()),
    div`.infoListItem__content`(
      valueContainer,
      div`.infoListItem__label`(text(label)),
    ),
  );

  useMaybeObservable(container, value, (next) => {
    unmountChildren(valueContainer);
    if (next) mount(valueContainer, highlightLinks(next));

    container.classList.toggle('hidden', !next);
  });

  return ripple({}, [container]);
}
