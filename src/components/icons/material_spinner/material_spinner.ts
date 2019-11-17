import { svgCodeToComponent } from 'core/factory';
import materialSpinnerCode from './material_spinner.svg?raw';
import './material_spinner.scss';

const materialSpinnerSvg = /*#__PURE__*/svgCodeToComponent(materialSpinnerCode); // eslint-disable-line spaced-comment

// eslint-disable-next-line quote-props
export default function materialSpinner({ className, 'class': _class, ...props }: Record<string, unknown> = {}) {
  const givenClassName = className || _class || '';
  return materialSpinnerSvg({ class: `materialSpinner ${givenClassName}`, ...props });
}
