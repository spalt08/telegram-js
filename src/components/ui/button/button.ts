import ripple from '../ripple/ripple';
import './button.scss';

type Props = {
  label?: string,
};

export default function button({ label = '' }: Props) {
  return ripple({ tag: 'button', className: 'button' }, [label]);
}
