import { Component, mount, unmount } from 'core/dom';
import { Child } from 'core/types';

type Props = {
  className?: string,
};

export default class LoginTransition extends Component<HTMLDivElement> {
  mounted: ?HTMLElement;

  constructor({ className = '' }: Props, children?: Child[]) {
    super('div', { className: `${className} login__transition` });

    // Initial Rendering
    if (children && children.length > 0) {
      this.mounted = mount(this.element, children[0]) as HTMLElement;
    }
  }

  transitRight(toElement: Child) {
    if (this.mounted) {
      this.mounted.className += ' removed';
      this.mounted.addEventListener('animationend', (event) => unmount(event.currentTarget));
    }

    this.mounted = mount(this.element, toElement) as HTMLElement;
    this.mounted.className += ' appeared';
    this.mounted.addEventListener('animationend', (event) => {
      const self = (event.currentTarget as HTMLElement);
      self.className = self.className.replace(' appeared', '');
    });
  }
}
