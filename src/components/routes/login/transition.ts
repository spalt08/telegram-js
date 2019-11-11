import { listenOnce, mount, unmount } from 'core/dom';
import { div } from 'core/html';

type Props = {
  className?: string,
};

/**
 * Component for handling login transition animations
 *
 * @example
 * const transitioner = new LoginTransition({}, div`.one`() );
 *
 * transitioner.translateRight( div`.two`() );
 * transitioner.translateLeft( div`.three`() );
 */
export default class LoginTransition {
  element: HTMLDivElement;

  mounted: HTMLElement | undefined;

  constructor({ className = '' }: Props, children?: Array<() => HTMLElement>) {
    this.element = div({ className: `${className} login__transition` });

    // Initial Rendering
    if (children && children.length > 0) {
      this.mounted = children[0]();
      mount(this.element, this.mounted);
    }
  }

  set(element: HTMLElement) {
    this.mounted = element;
    mount(this.element, this.mounted);
  }

  translateRight(elementCreator: () => HTMLElement) {
    if (this.mounted) {
      this.mounted.classList.add('removed');
      listenOnce(this.mounted, 'animationend', (event) => {
        const self = event.currentTarget as HTMLElement;
        unmount(self);
        self.classList.remove('removed'); // For a cased when the element will be reused
      });
    }

    this.mounted = elementCreator();
    this.mounted.classList.add('appeared');
    listenOnce(this.mounted, 'animationend', (event: Event) => {
      const self = event.currentTarget as HTMLElement;
      self.classList.remove('appeared');
    });
    mount(this.element, this.mounted);
  }
}
