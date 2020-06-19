import ripple from '../ripple/ripple';
import './round_button.scss';

export type Color = 'accent' | 'danger';

export interface Props extends Record<string, any> {
  className?: string;
  color?: Color;
}

/**
 * Basic button
 */
export default function roundButton({ className = '', color, ...props }: Props, child: Node) {
  return ripple({
    ...props,
    tag: 'button',
    className: `roundButton ${className} ${color ? `-${color}` : ''}`,
    contentClass: 'roundButton__content',
  }, [child]);
}
