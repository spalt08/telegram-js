import { listenOnce, mount, unmount } from 'core/dom';
import { div } from 'core/html';

/**
 * Component for handling login transition animations
 *
 * @example
 * const transitioner = new LoginTransition({});
 *
 * transitioner.set(div`.one`());
 *
 * transitioner.translateRight( () => div`.two`() );
 * transitioner.translateLeft( () => div`.three`() );
 */
export default class LoginTransition {
  element: HTMLDivElement;

  mounted: HTMLElement | undefined;

  constructor() {
    this.element = div({ className: 'login__transition' });
  }

  /** Sets element as initial view */
  set(element: () => HTMLElement) {
    this.mounted = element();
    mount(this.element, this.mounted);
  }

  /** Slide right animation */
  translateRight(next: () => HTMLElement) {
    this.translate('removed-left', 'appeared-right', next);
  }

  /** Slide left animation */
  translateLeft(next: () => HTMLElement) {
    this.translate('removed-right', 'appeared-left', next);
  }

  /** Performs change animation */
  translate(removeClass: string, appearClass: string, next: () => HTMLElement) {
    // Remove mounted element
    if (this.mounted) {
      this.mounted.classList.add(removeClass);
      listenOnce(this.mounted, 'animationend', (event) => {
        const self = event.currentTarget as HTMLElement;
        unmount(self);
        self.classList.remove(removeClass); // For a cased when the element will be reused
      });
    }

    // Mount new element
    this.mounted = next();
    this.mounted.classList.add(appearClass);
    listenOnce(this.mounted, 'animationend', (event: Event) => {
      const self = event.currentTarget as HTMLElement;
      self.classList.remove(appearClass);
    });
    mount(this.element, this.mounted);
  }
}
