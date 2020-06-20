import { BehaviorSubject } from 'rxjs';
import { first } from 'rxjs/operators';
import client from 'client/client';
import { DialogFilter, DialogFilterSuggested } from 'mtproto-js';
import { persistentCache } from 'cache';
import { ARCHIVE_FOLDER_ID, ROOT_FOLDER_ID } from 'const/api';
import AuthService, { AuthStage } from '../auth';
import DialogsService from '../dialog/dialog';
import makeFolderIndex from './folderIndex';
import makeFilterIndex from './filterIndex';
import { FilterRecord } from './commonTypes';
import makeFilterPeerSearchSession from './filterPeerSearchSession';

// A key is a filter id
export type Filters = ReadonlyMap<number, FilterRecord>;
export type SuggestedFilters = ReadonlyMap<number, DialogFilterSuggested>;

const startLoadDelay = 500;

/**
 * Watches dialog folders and filters
 *
 * @link https://core.telegram.org/api/folders
 */
export default class FolderService {
  readonly isLoadingFilters = new BehaviorSubject(false);

  readonly isLoadingSuggestedFilters = new BehaviorSubject(false);

  readonly rootIndex = makeFolderIndex(ROOT_FOLDER_ID);

  readonly archiveIndex = makeFolderIndex(ARCHIVE_FOLDER_ID);

  /**
   * A.k.a. folders
   *
   * `undefined` means "not loaded yet".
   *
   * @ignore Don't write directly, use this.setNewFiltersLocally instead
   */
  readonly filters = new BehaviorSubject<Filters | undefined>(undefined);

  readonly suggestedFilters = new BehaviorSubject<SuggestedFilters | undefined>(undefined);

  #dialogsService: DialogsService;

  #areRealFiltersLoaded = false;

  constructor(authService: AuthService, dialogsService: DialogsService) {
    this.#dialogsService = dialogsService;

    authService.state
      .pipe(first((state) => state === AuthStage.Authorized))
      .subscribe(() => setTimeout(() => this.loadFilters(), startLoadDelay));

    persistentCache.isRestored
      .pipe(first((restored) => restored))
      .subscribe(() => {
        if (!this.#areRealFiltersLoaded && persistentCache.filters) {
          this.setNewFiltersLocally(persistentCache.filters);
        }

        this.filters.subscribe((filters) => {
          if (filters) {
            persistentCache.filters = [...filters.values()].map((record) => record.filter);
          }
        });
      });

    client.updates.on('updateDialogFilters', () => {
      this.loadFilters();
    });

    client.updates.on('updateDialogFilter', (update) => {
      const newFilters: DialogFilter[] = [];
      let isUpdatedFilterFound = false;

      if (this.filters.value) {
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
      }

      if (!isUpdatedFilterFound && update.filter) {
        newFilters.push(update.filter);
      }

      this.setNewFiltersLocally(newFilters);
    });

    client.updates.on('updateDialogFilterOrder', (update) => {
      const newFilters: DialogFilter[] = [];
      update.order.forEach((id) => {
        const filter = this.filters.value?.get(id)?.filter;
        if (filter) {
          newFilters.push(filter);
        }
      });
      this.setNewFiltersLocally(newFilters);
    });
  }

  async loadFilters() {
    if (this.isLoadingFilters.value) {
      this.isLoadingFilters.pipe(first((loading) => !loading)).toPromise();
    }

    try {
      this.isLoadingFilters.next(true);

      const filters = await client.call('messages.getDialogFilters', {});
      this.#areRealFiltersLoaded = true;
      this.setNewFiltersLocally(filters);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('Failed to load filters', error);
      }
    } finally {
      this.isLoadingFilters.next(false);
    }
  }

  async loadFiltersIfRequired() {
    if (!this.#areRealFiltersLoaded) {
      await this.loadFilters();
    }
  }

  async loadSuggestedFilters() {
    if (this.isLoadingSuggestedFilters.value) {
      this.isLoadingSuggestedFilters.pipe(first((loading) => !loading)).toPromise();
    }

    try {
      this.isLoadingSuggestedFilters.next(true);

      const filters = await client.call('messages.getSuggestedDialogFilters', {});
      const newSuggestedFilters = new Map<number, DialogFilterSuggested>();

      filters.forEach((suggestion) => {
        newSuggestedFilters.set(suggestion.filter.id, suggestion);
      });

      this.suggestedFilters.next(newSuggestedFilters);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('Failed to load suggested filters', error);
      }
    } finally {
      this.isLoadingSuggestedFilters.next(false);
    }
  }

  async createFilter(filter: Readonly<DialogFilter>, isEager?: boolean) {
    const filterWithId = {
      ...filter,
      id: this.getIdForNewFilter(),
    };

    // todo: Handle fail responses from the API here and further
    const sendPromise = client.call('messages.updateDialogFilter', { id: filterWithId.id, filter: filterWithId })
      // Server puts the new filter to the start by default so we need to move it to the end explicitly
      .then(() => client.call('messages.updateDialogFiltersOrder', { order: [...(this.filters.value?.keys() ?? [])] }));

    if (!isEager) {
      await sendPromise;
    }

    this.pushNewFilterLocally(filterWithId);
  }

  async changeFilter(filter: Readonly<DialogFilter>, isEager?: boolean) {
    const sendPromise = client.call('messages.updateDialogFilter', { id: filter.id, filter });

    if (!isEager) {
      await sendPromise;
    }

    this.changeFilterLocally(filter);
  }

  async removeFilter(filterId: number, isEager?: boolean) {
    const sendPromise = client.call('messages.updateDialogFilter', { id: filterId })
      .then(() => this.loadSuggestedFilters());

    if (!isEager) {
      await sendPromise;
    }

    this.removeFilterLocally(filterId);
  }

  async addSuggesterFilter(filterId: number, isEager?: boolean) {
    const filter = this.suggestedFilters.value?.get(filterId)?.filter;
    if (filter) {
      await this.createFilter(filter, isEager);
      this.removeSuggestedFilterLocally(filterId);
    }
  }

  makePeerSearchSession() {
    return makeFilterPeerSearchSession(this, this.#dialogsService);
  }

  private setNewFiltersLocally(filters: readonly Readonly<DialogFilter>[]) {
    const oldFilters = this.filters.value;
    const newFilters = new Map<number, FilterRecord>();

    filters.forEach((filter) => {
      const { id } = filter;
      const oldRecord = oldFilters?.get(id);
      const index = oldRecord && filter === oldRecord.filter ? oldRecord.index : makeFilterIndex(filter, this.#dialogsService);
      newFilters.set(id, { filter, index });
    });

    this.filters.next(newFilters);
  }

  private pushNewFilterLocally(filter: Readonly<DialogFilter>) {
    const newFilters: DialogFilter[] = [];
    // eslint-disable-next-line no-unused-expressions
    this.filters.value?.forEach((record) => newFilters.push(record.filter));
    newFilters.push(filter);
    this.setNewFiltersLocally(newFilters);
  }

  private changeFilterLocally(filter: Readonly<DialogFilter>) {
    if (this.filters.value) {
      const newFilters: DialogFilter[] = [];
      this.filters.value.forEach((record) => newFilters.push(record.filter.id === filter.id ? filter : record.filter));
      this.setNewFiltersLocally(newFilters);
    }
  }

  private removeFilterLocally(filterId: number) {
    if (this.filters.value) {
      const newFilters: DialogFilter[] = [];
      this.filters.value.forEach((record) => {
        if (record.filter.id !== filterId) {
          newFilters.push(record.filter);
        }
      });
      this.setNewFiltersLocally(newFilters);
    }
  }

  private removeSuggestedFilterLocally(filterId: number) {
    const newSuggestedFilters = new Map<number, DialogFilterSuggested>();
    // eslint-disable-next-line no-unused-expressions
    this.suggestedFilters.value?.forEach((suggestion, id) => {
      if (id !== filterId) {
        newSuggestedFilters.set(id, suggestion);
      }
    });
    this.suggestedFilters.next(newSuggestedFilters);
  }

  private getIdForNewFilter() {
    // eslint-disable-next-line max-len
    // Taken from https://github.com/TelegramMessenger/Telegram-iOS/blob/619fe5902784555b6947554119185f27c0742eeb/submodules/TelegramCore/Sources/ChatListFiltering.swift#L780

    const filters = this.filters.value;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const id = 2 + Math.random() * (255 - 2) | 0;
      if (!filters?.has(id)) {
        return id;
      }
    }
  }
}
