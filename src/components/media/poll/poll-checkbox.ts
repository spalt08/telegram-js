import { checkbox } from 'components/ui';
import { div } from 'core/html';
import { mount, unmount } from 'core/dom';
import { svgCodeToComponent } from 'core/factory';
import { getInterface } from 'core/hooks';
import spinnerCode from './spinner.svg?raw';

import './poll-checkbox.scss';

const spinnerSvg = svgCodeToComponent(spinnerCode);

export default function pollCheckbox(multiple: boolean, clickCallback: (reset: () => void) => void) {
  if (multiple) {
    return div`.pollCheckbox`(checkbox());
  }
  const container = div`.pollCheckbox`();
  const cb = checkbox({
    onChange: () => {
      unmount(cb);
      const effect = div`.pollCheckbox__ripple`({
        onAnimationEnd: () => setTimeout(() => unmount(effect), 1000),
      });
      mount(container, effect);
      const spinner = spinnerSvg();
      mount(container, spinner);
      clickCallback(() => {
        unmount(spinner);
        getInterface(cb).setChecked(false);
        mount(container, cb);
      });
    },
  });
  mount(container, cb);
  return container;
}
