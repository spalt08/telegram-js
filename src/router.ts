import { mount, unmount } from 'core/dom';
import { div } from 'core/html';

export const history = {
  push: (path: string) => window.history.pushState({ path }, 'Telegram Web', path),
};

export class Router {
  element: HTMLDivElement;

  mounted: Node | undefined;

  constructor(public routes: Record<string, () => Node>) {
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

    if (this.mounted) {
      unmount(this.mounted);
      this.mounted = undefined;
    }

    if (routeHandler) {
      this.mounted = routeHandler();
      if (this.mounted) mount(this.element, this.mounted);
    }
  }
}
