import { text } from 'core/html';
import { MaybeMutatable } from 'core/mutation';
import ripple from '../ripple/ripple';
import './button.scss';

type Props = {
  label?: MaybeMutatable<string>,
};

/**
 * Basic button
 */
export default function button({ label = '' }: Props) {
  return ripple({ tag: 'button', className: 'button' }, [
    text(label),
  ]);
}
