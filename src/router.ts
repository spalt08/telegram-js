import { ElementOrComponent } from 'core/dom';
import { mount } from 'core/dom';
import { Component } from 'core';

export const history = {
  push: (path: string) => window.history.pushState({ path }, 'Telegram Web', path),
};

export class Router extends Component<HTMLDivElement> {
  mountedComponent: ElementOrComponent | undefined;

  constructor(public routes: Record<string, () => ElementOrComponent>) {
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
      mount(this.ref, this.mountedComponent);
    }
  }
}
