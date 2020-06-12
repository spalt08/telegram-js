import { BehaviorSubject } from 'rxjs';
import { first } from 'rxjs/operators';
import client from 'client/client';
import { DialogFilter } from 'mtproto-js';
import { persistentCache } from 'cache';
import { ARCHIVE_FOLDER_ID, ROOT_FOLDER_ID } from 'const/api';
import AuthService, { AuthStage } from '../auth';
import DialogsService from '../dialog/dialog';
import makeFolderIndex from './folderIndex';
import makeFilterIndex from './filterIndex';
import { FilterRecord } from './commonTypes';

export type Filters = ReadonlyMap<number, FilterRecord>;

const startLoadDelay = 500;

function loadFilters() {
  // When there are no filters, the client returns not an array (meanwhile the type says that the response is always an array)
  // todo: Fix it in mtproto and remove the `|| []` workaround
  return client.call('messages.getDialogFilters', {});
}

/**
 * Watches dialog folders and filters
 *
 * @link https://core.telegram.org/api/folders
 */
export default class FolderService {
  readonly isLoading = new BehaviorSubject(false);

  readonly allIndex = makeFolderIndex(ROOT_FOLDER_ID);

  readonly archiveIndex = makeFolderIndex(ARCHIVE_FOLDER_ID);

  /**
   * A.k.a. folders
   *
   * @ignore Don't write directly, use this.setNewFilters instead
   */
  readonly filters = new BehaviorSubject<Filters>(new Map());

  #areRealFiltersLoaded = false;

  constructor(authService: AuthService, private dialogService: DialogsService) {
    authService.state
      .pipe(first((state) => state === AuthStage.Authorized))
      .subscribe(() => setTimeout(() => this.load(), startLoadDelay));

    persistentCache.isRestored
      .pipe(first((restored) => restored))
      .subscribe(() => {
        if (!this.#areRealFiltersLoaded && persistentCache.filters) {
          this.setNewFilters(persistentCache.filters);
        }

        this.filters.subscribe((filters) => {
          persistentCache.filters = [...filters.values()].map((record) => record.filter);
        });
      });

    client.updates.on('updateDialogFilters', () => {
      this.load();
    });

    client.updates.on('updateDialogFilter', (update) => {
      const newFilters: DialogFilter[] = [];
      let isUpdatedFilterFound = false;

      this.filters.value.forEach(({ filter }, id) => {
        if (update.id !== id) {
          newFilters.push(filter);
        } else if (update.filter) {
          newFilters.push(update.filter);
          isUpdatedFilterFound = true;
        } else {
          // Otherwise the filter is removed
        }
      });

      if (!isUpdatedFilterFound && update.filter) {
        newFilters.push(update.filter);
      }

      this.setNewFilters(newFilters);
    });

    client.updates.on('updateDialogFilterOrder', (update) => {
      const newFilters: DialogFilter[] = [];
      update.order.forEach((id) => {
        const filter = this.filters.value.get(id)?.filter;
        if (filter) {
          newFilters.push(filter);
        }
      });
      this.setNewFilters(newFilters);
    });
  }

  async load() {
    if (this.isLoading.value) {
      this.isLoading.pipe(first((loading) => !loading)).toPromise();
    }

    try {
      this.isLoading.next(true);

      const filters = await loadFilters();
      this.#areRealFiltersLoaded = true;
      this.setNewFilters(filters);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('Failed to load filters', error);
      }
    } finally {
      this.isLoading.next(false);
    }
  }

  private setNewFilters(filters: readonly Readonly<DialogFilter>[]) {
    const oldFilters = this.filters.value;
    const newFilters = new Map<number, FilterRecord>();

    filters.forEach((filter) => {
      const { id } = filter;
      const oldRecord = oldFilters.get(id);
      const index = oldRecord && filter === oldRecord.filter ? oldRecord.index : makeFilterIndex(filter, this.dialogService);
      newFilters.set(id, { filter, index });
    });

    this.filters.next(newFilters);
  }
}
