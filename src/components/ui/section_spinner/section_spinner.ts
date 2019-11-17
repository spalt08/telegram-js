import { materialSpinner } from '../../icons';
import './section_spinner.scss';

/**
 * Animated spinner for a big section of UI
 */
export default function sectionSpinner({ className = '', ...props }: Record<string, unknown> = {}) {
  return materialSpinner({ class: `sectionSpinner ${className}`, ...props });
}
