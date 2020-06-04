import binarySearch from 'binary-search';
import { BehaviorSubject } from 'rxjs';
import { first } from 'rxjs/operators';
import { ContactsTopPeers, Peer, TopPeer } from 'mtproto-js';
import client from 'client/client';
import { chatCache, persistentCache, userCache } from 'cache';
import { arePeersSame } from 'helpers/api';
import MessagesService from './message/message';

const RATING_E_DECAY = 2419200; // todo: Load it from the server config: https://core.telegram.org/method/help.getConfig

const maxLoadCount = 15;
const startLoadDelay = 1000;
const activePeerChangeReactionDelay = 700; // Delayed to not overload the hard peer change process
const updateInterval = 24 * 60 * 60 * 1000;
const autoCheckInterval = 5 * 60 * 1000;

export interface LoadedTopPeers {
  items: TopPeer[],
  fetchedAt: number, // unix ms
}

export type TopPeersState = 'disabled' | 'unknown' | LoadedTopPeers;

function getNewPeerRating(oldRating: number, fetchedAt: number /* unix ms */, selectedAt: number /* unix ms */): number {
  return oldRating + Math.exp((selectedAt - fetchedAt) / 1000 / RATING_E_DECAY);
}

function addRatingToPeer(top: LoadedTopPeers, selectedPeer: Peer, selectedAt: number /* unix ms */): LoadedTopPeers {
  if (top.fetchedAt > selectedAt) {
    return top;
  }

  const peerIndex = top.items.findIndex((item) => arePeersSame(item.peer, selectedPeer));
  if (peerIndex === -1) {
    return top;
  }

  let item = top.items[peerIndex];
  item = { ...item, rating: getNewPeerRating(item.rating, top.fetchedAt, selectedAt) };

  const newItems = [...top.items.slice(0, peerIndex), ...top.items.slice(peerIndex + 1)];
  let newPeerIndex = binarySearch(top.items, item, (item1, item2) => item2.rating - item1.rating);
  newPeerIndex = newPeerIndex >= 0 ? newPeerIndex : (-newPeerIndex - 1);
  newItems.splice(newPeerIndex, 0, item);

  return { ...top, items: newItems };
}

async function loadTopUsers(): Promise<TopPeersState> {
  let response: ContactsTopPeers;

  try {
    response = await client.call('contacts.getTopPeers', {
      correspondents: true,
      offset: 0,
      limit: maxLoadCount,
      hash: 0,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('Failed to load top users', error);
    }
    return 'unknown';
  }

  switch (response._) {
    case 'contacts.topPeersDisabled': return 'disabled';
    case 'contacts.topPeers':
      chatCache.put(response.chats);
      userCache.put(response.users);

      for (let i = 0; i < response.categories.length; ++i) {
        if (response.categories[i].category._ === 'topPeerCategoryCorrespondents') {
          return {
            items: response.categories[i].peers,
            fetchedAt: Date.now(),
          };
        }
      }

      return 'unknown';
    default: return 'unknown';
  }
}

export default class TopUsersService {
  readonly isUpdating = new BehaviorSubject(false);

  readonly topUsers = new BehaviorSubject<TopPeersState>('unknown');

  protected autoUpdateTimer = 0;

  constructor(messagesService: MessagesService) {
    messagesService.activePeer.subscribe(this.handleActivePeer);

    persistentCache.isRestored
      .pipe(first((isRestored) => isRestored))
      .subscribe(() => {
        if (this.topUsers.value === 'unknown') {
          if (persistentCache.topUsers) {
            this.topUsers.next(persistentCache.topUsers);
          }
          this.resetAutoUpdateTimer(startLoadDelay);
        }
        this.topUsers.subscribe((topUsers) => {
          persistentCache.topUsers = typeof topUsers === 'object' ? topUsers : undefined;
        });
      });
  }

  async update() {
    if (this.isUpdating.value) {
      await this.isUpdating.pipe(first((isUpdating) => !isUpdating)).toPromise();
      return;
    }

    try {
      this.isUpdating.next(true);
      const topUsers = await loadTopUsers();
      if (topUsers !== 'unknown') {
        this.topUsers.next(topUsers);
      }
    } finally {
      this.isUpdating.next(false);
      this.resetAutoUpdateTimer();
    }
  }

  async updateIfRequired() {
    if (!persistentCache.isRestored.value) {
      return;
    }

    try {
      const topUsers = this.topUsers.value;

      if (
        topUsers === 'unknown'
        || (typeof topUsers === 'object' && Date.now() >= topUsers.fetchedAt + updateInterval)
      ) {
        await this.update();
      }
    } finally {
      this.resetAutoUpdateTimer();
    }
  }

  /**
   * @link https://core.telegram.org/api/top-rating What's going on
   */
  protected handleActivePeer = (peer: Peer | null) => {
    if (!peer) {
      return;
    }

    const selectedAt = Date.now();

    setTimeout(() => {
      const topUsers = this.topUsers.value;
      if (typeof topUsers === 'object') {
        const newTopUsers = addRatingToPeer(topUsers, peer, selectedAt);
        if (newTopUsers !== topUsers) {
          this.topUsers.next(newTopUsers);
        }
      }
    }, activePeerChangeReactionDelay);
  };

  protected resetAutoUpdateTimer(time = autoCheckInterval) {
    clearTimeout(this.autoUpdateTimer);
    this.autoUpdateTimer = (setTimeout as typeof window.setTimeout)(
      () => this.updateIfRequired(),
      time,
    );
  }
}
