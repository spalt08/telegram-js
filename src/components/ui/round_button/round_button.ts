import ripple from '../ripple/ripple';
import './round_button.scss';

/**
 * Basic button
 */
export default function roundButton({ className = '', ...props }, child: Node) {
  return ripple({
    ...props,
    tag: 'button',
    className: `roundButton ${className}`,
    contentClass: 'roundButton__content',
  }, [child]);
}
