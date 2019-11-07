import { mount, unmount } from 'core/dom';
import { useListenWhileMounted, useOnMount } from 'core/hooks'; // eslint-disable-line import/named
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

    useListenWhileMounted(this.element, window, 'popstate', (event: PopStateEvent) => {
      event.preventDefault();
      this.fetchLocation();
    });

    useOnMount(this.element, () => this.fetchLocation());
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
