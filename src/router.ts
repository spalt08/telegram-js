import { Child } from 'core/types';
import { mount } from 'core/dom';
import { div } from 'core/html';

export const history = {
  push: (path: string) => window.history.pushState({ path }, 'Telegram Web', path),
};

export class Router {
  element: HTMLDivElement;

  mounted: Child | undefined;

  constructor(public routes: Record<string, () => Child>) {
    this.element = div`.main`();
    this.routes = routes;

    window.addEventListener('popstate', (event) => {
      this.fetchLocation();
      event.preventDefault();
    });

    // To Do: this.element.onmount = this.fetchLocation;
    this.fetchLocation();
  }

  fetchLocation() {
    const routeHandler = this.routes[window.location.pathname] || this.routes.default;

    if (routeHandler) {
      this.mounted = routeHandler();
      if (this.mounted) mount(this.element, this.mounted);
    }
  }
}
