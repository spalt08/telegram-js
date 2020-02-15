import { mount, unmount } from 'core/dom';
import { useListenWhileMounted, useOnMount } from 'core/hooks'; // eslint-disable-line import/named
import { div } from 'core/html';
import client from 'client/client';
import * as route from 'components/routes';

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

  fetchLocation(uid?: number) {
    let newRoute = '';

    if (client.getUserID() || uid) newRoute = '/';
    else newRoute = '/login';

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

export const router = new Router({
  '/': route.home,
  '/login': route.login,
  default: route.login,
});
