import ripple from '../ripple/ripple';
import './round_button.scss';

/**
 * Basic button
 */
export default function roundButton({ className = '' }, child: Node) {
  const element = (
    ripple({ tag: 'button', className: `roundButton ${className}` }, [child])
  );

  return element;
}
