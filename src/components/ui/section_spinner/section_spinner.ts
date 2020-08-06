import { div } from 'core/html';
import { materialSpinner } from '../../icons';
import './section_spinner.scss';

/**
 * Animated spinner for a big section of UI
 */
export default function sectionSpinner({ className = '', useBackdrop = false, ...props }: Record<string, unknown> = {}) {
  return useBackdrop
    ? div({ class: `sectionSpinner ${className}`, ...props }, materialSpinner())
    : materialSpinner({ class: `sectionSpinner ${className}`, ...props });
}
