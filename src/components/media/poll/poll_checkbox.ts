import { checkbox } from 'components/ui';
import { animationFrameStart, mount, unmount } from 'core/dom';
import { svgCodeToComponent } from 'core/factory';
import { getInterface, useInterface } from 'core/hooks';
import { div } from 'core/html';
import './poll_checkbox.scss';
import spinnerCode from './spinner.svg?raw';

const spinnerSvg = svgCodeToComponent(spinnerCode);

type Props = {
  multiple: boolean,
  clickCallback: (selected: boolean) => void,
};

export default function pollCheckbox({ multiple, clickCallback }: Props) {
  if (multiple) {
    const cb = checkbox({
      onChange: (checked) => clickCallback(checked),
    });
    return useInterface(div`.pollCheckbox`(cb), {
      reset: () => getInterface(cb).setChecked(false),
    });
  }

  const container = div`.pollCheckbox`();
  const spinner = spinnerSvg();
  const cb = checkbox({
    onChange: (checked) => {
      unmount(cb);
      const effect = div`.pollCheckbox__ripple`({
        onAnimationEnd: async () => {
          await animationFrameStart();
          unmount(effect);
        },
      });
      mount(container, effect);
      mount(container, spinner);
      clickCallback(checked);
    },
  });
  mount(container, cb);
  return useInterface(container, {
    reset: () => {
      unmount(spinner);
      getInterface(cb).setChecked(false);
      mount(container, cb);
    },
  });
}
