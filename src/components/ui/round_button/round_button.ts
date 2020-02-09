import { listen } from 'core/dom';
import ripple from '../ripple/ripple';
import './round_button.scss';

/**
 * Basic button
 */
export default function roundButton({ className = '', onClick = () => { } }, child: Node) {
  const element = (
    ripple({ tag: 'button', className: `roundButton ${className}` }, [child])
  );

  listen(element, 'click', onClick);

  return element;
}
