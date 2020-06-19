import { tgs, TgsProps } from 'components/ui';
import { getInterface, useOnMount } from 'core/hooks';
import './screen_tgs.scss';

/**
 * Like a plain TGS but optimized to run in a sidebar screen
 */
export default function screenTgs({ className = '', ...props }: Omit<TgsProps, 'autoplay'>) {
  const image = tgs({
    ...props,
    className: `${className} screenTgs -hidden`,

    // When the sticker is loaded during the screen appear animation, a freeze happens.
    // The animation start is delayed to avoid the animation freeze.
    autoplay: false,
  });

  let unwatchMount: (() => void) | undefined = useOnMount(image, () => {
    setTimeout(() => {
      getInterface(image).play();
      image.classList.remove('-hidden');
    }, 400); // The number should be more than the sidebar transition duration

    if (unwatchMount) {
      unwatchMount();
      unwatchMount = undefined;
    }
  });

  return image;
}
