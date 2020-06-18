import { div, h3, text } from 'core/html';
import { MaybeObservable } from 'core/types';
import roundButton from '../round_button/round_button';
import './heading.scss';

type HeadingIcon = {
  icon: () => SVGSVGElement,
  position: 'left' | 'right',
  onClick: (event?: MouseEvent) => void,
};

type Props = {
  title: MaybeObservable<string>,
  element?: HTMLElement,
  buttons: HeadingIcon[],
  className?: string,
};

export default function heading({ title, element, buttons, className = '' }: Props) {
  const leftBtns = buttons.filter(({ position }) => position === 'left');
  const rightBtns = buttons.filter(({ position }) => position === 'right');

  return div`.sidebarHeading ${className}`(
    ...leftBtns.map(({ icon, onClick }) => roundButton({ className: 'sidebarHeading__icon-left', onClick }, icon())),
    element || h3(text(title)),
    ...rightBtns.map(({ icon, onClick }) => roundButton({ className: 'sidebarHeading__icon-left', onClick }, icon())),
  );
}
