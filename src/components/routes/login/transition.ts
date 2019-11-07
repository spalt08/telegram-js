import { mount, unmount } from 'core/dom';
import { div } from 'core/html';

type Props = {
  className?: string,
};

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

  transitRight(elementCreator: () => HTMLElement) {
    if (this.mounted) {
      this.mounted.className += ' removed';
      this.mounted.addEventListener('animationend', (event) => unmount(event.currentTarget as HTMLElement));
    }

    this.mounted = elementCreator();
    this.mounted.className += ' appeared';
    this.mounted.addEventListener('animationend', (event) => {
      const self = (event.currentTarget as HTMLElement);
      self.className = self.className.replace(' appeared', '');
    });
    mount(this.element, this.mounted);
  }
}
