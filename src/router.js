// @flow

import { Component } from 'core';

export const history = {
  push: (path: string) => window.history.pushState({ path }, 'Telegram Web', path),
};

export class Router extends Component<HTMLDivElement> {
  routes: { [string]: string }

  mountedComponent: ?Component;

  constructor(routes: { [string]: string }) {
    super('div', { className: 'Main' });

    this.routes = routes;

    window.onpopstate = (event: PopStateEvent) => {
      this.fetchLocation();
      event.preventDefault();
    };
  }

  didMount() {
    this.fetchLocation();
  }

  fetchLocation() {
    const ElementCreator = this.routes[window.location.pathname] || this.routes.default;

    if (Element) {
      this.mountedComponent = new ElementCreator().mount(this.ref);
    }
  }
}
