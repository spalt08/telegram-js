// @flow

import type { ElementOrComponent } from 'core/dom';
import { mount } from 'core/dom';
import { Component } from 'core';

export const history = {
  push: (path: string) => window.history.pushState({ path }, 'Telegram Web', path),
};

export class Router extends Component<HTMLDivElement> {
  routes: { [string]: () => ElementOrComponent }

  mountedComponent: ?ElementOrComponent;

  constructor(routes: { [string]: () => ElementOrComponent }) {
    super('div', { className: 'main' });

    this.routes = routes;

    window.onpopstate = (event) => {
      this.fetchLocation();
      event.preventDefault();
    };
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
