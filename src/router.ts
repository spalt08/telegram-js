import { Child } from 'core/types';
import { Component, mount } from 'core/dom';

interface Factory {
  new(): HTMLElement,
}

export const history = {
  push: (path: string) => window.history.pushState({ path }, 'Telegram Web', path),
};

export class Router extends Component<HTMLDivElement> {
  mountedComponent: Child | undefined;

  constructor(public routes: Record<string, Factory>) {
    super('div', { className: 'main' });

    this.routes = routes;

    window.addEventListener('popstate', (event) => {
      this.fetchLocation();
      event.preventDefault();
    });
  }

  didMount() {
    this.fetchLocation();
  }

  fetchLocation() {
    const element = this.routes[window.location.pathname] || this.routes.default;

    if (element) {
      this.mountedComponent = new element();
      if (this.mountedComponent) mount(this.element, this.mountedComponent);
    }
  }
}
