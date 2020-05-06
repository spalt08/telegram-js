import { div, h3, text } from 'core/html';
import { back } from 'components/icons';
import roundButton from '../round_button/round_button';
import './heading.scss';

type Props = {
  title: string,
  onClick: () => void,
};

export default function heading({ title, onClick }: Props) {
  return div`.sidebarHeading`(
    roundButton({ className: 'sidebarHeading__icon-left', onClick }, back()),
    h3(text(title)),
  );
}
