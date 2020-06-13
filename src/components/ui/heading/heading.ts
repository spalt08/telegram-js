import { div, h3, text } from 'core/html';
import roundButton from '../round_button/round_button';
import './heading.scss';

type HeadingIcon = {
  icon: () => SVGSVGElement,
  position: 'left' | 'right',
  onClick: (event?: MouseEvent) => void,
};

type Props = {
  title: string,
  buttons: HeadingIcon[],
  className?: string,
};

export default function heading({ title, buttons, className = '' }: Props) {
  const leftBtns = buttons.filter(({ position }) => position === 'left');
  const rightBtns = buttons.filter(({ position }) => position === 'right');

  return div`.sidebarHeading ${className}`(
    ...leftBtns.map(({ icon, onClick }) => roundButton({ className: 'sidebarHeading__icon-left', onClick }, icon())),
    h3(text(title)),
    ...rightBtns.map(({ icon, onClick }) => roundButton({ className: 'sidebarHeading__icon-left', onClick }, icon())),
  );
}
