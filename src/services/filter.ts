import { BehaviorSubject } from 'rxjs';
import { first } from 'rxjs/operators';
import client from 'client/client';
import { DialogFilter } from 'mtproto-js';
import { persistentCache } from 'cache';
import AuthService, { AuthStage } from './auth';

const startLoadDelay = 500;

const filtersMock: DialogFilter[] = [
  {
    _: 'dialogFilter',
    id: 234,
    contacts: true,
    title: 'Contacts',
    pinned_peers: [],
    include_peers: [],
    exclude_peers: [],
  },
  {
    _: 'dialogFilter',
    id: 12,
    bots: true,
    title: 'Bots',
    pinned_peers: [],
    include_peers: [],
    exclude_peers: [],
  },
  {
    _: 'dialogFilter',
    id: 666,
    broadcasts: true,
    title: 'Channels',
    pinned_peers: [],
    include_peers: [],
    exclude_peers: [],
  },
];

function loadFilters() {
  return client.call('messages.getDialogFilters', {});
}

/**
 * Watches dialog filters
 */
export default class FilterService {
  readonly isLoading = new BehaviorSubject(false);

  /**
   * A.k.a. folders
   */
  readonly filters = new BehaviorSubject<readonly Readonly<DialogFilter>[]>([]);

  #areRealFiltersLoaded = false;

  constructor(authService: AuthService) {
    authService.state
      .pipe(first((state) => state === AuthStage.Authorized))
      .subscribe(() => setTimeout(() => this.load(), startLoadDelay));

    persistentCache.isRestored
      .pipe(first((restored) => restored))
      .subscribe(() => {
        if (!this.#areRealFiltersLoaded && persistentCache.filters) {
          this.filters.next(persistentCache.filters);
        }

        this.filters.subscribe((filters) => persistentCache.filters = filters);
      });

    // todo: Handle push updates
  }

  async load() {
    if (this.isLoading.value) {
      this.isLoading.pipe(first((loading) => !loading)).toPromise();
    }

    try {
      this.isLoading.next(true);

      const filters = await loadFilters();
      this.#areRealFiltersLoaded = true;
      this.filters.next(filters);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('Failed to load filters', error);
      }
    } finally {
      this.isLoading.next(false);
    }
  }
}
