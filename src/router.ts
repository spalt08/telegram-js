import { map } from 'rxjs/operators';
import { mount, unmount } from 'core/dom';
import { useListenWhileMounted, useObservable, useOnMount } from 'core/hooks';
import { div } from 'core/html';
import { auth, AuthStage } from 'services';
import home from 'components/home';
import login from 'components/login/login';

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

    useObservable(
      this.element,
      auth.state.pipe(map((state) => state === AuthStage.Authorized)),
      true,
      () => this.fetchLocation(),
    );
  }

  fetchLocation() {
    const newRoute = auth.userID ? '/' : '/login';

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
  '/': home,
  '/login': login,
  default: login,
});
