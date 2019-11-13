import { mount, unmount } from 'core/dom';
import { useListenWhileMounted, useOnMount } from 'core/hooks'; // eslint-disable-line import/named
import { div } from 'core/html';

const hashRouter = true;

export const history = {
  push: (path: string) => window.history.pushState({ path }, 'Telegram Web', hashRouter ? `#${path}` : path),
  state: (): string => hashRouter ? window.location.hash.slice(1) : window.location.pathname,
};

/**
 * Main router handler
 *
 * @example
 * const router = new Router({
 *  '/login': div`.login`(...children),
 *  '/messages': div`.messages`(...children),
 * })
 */
export class Router {
  element: HTMLDivElement;

  mounted: Node | undefined;

  currentRoute: string | undefined;

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
    let newRoute = window.location.pathname;
    if (hashRouter) newRoute = window.location.hash.slice(1);

    if (this.currentRoute !== newRoute) {
      const routeHandler = this.routes[newRoute] || this.routes.default;

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
}
