import { BehaviorSubject, Subscription } from 'rxjs';
import { Peer } from 'mtproto-js';
import { arePeersSame } from 'helpers/api';
import makeSearchSession, {
  SearchSession,
  SearchResult,
  SearchRequest,
  emptySearchResult,
} from './message_search_session';

export default class MessageSearchService {
  readonly result = new BehaviorSubject<SearchResult>(emptySearchResult);

  readonly isSearching = new BehaviorSubject(false);

  readonly isLoadingMore = new BehaviorSubject(false);

  #session?: SearchSession;

  #sessionSubscriptions: Subscription[] = [];

  #currentPeer: Readonly<Peer> | undefined;

  public getPeer(): Readonly<Peer> | undefined {
    return this.#currentPeer;
  }

  public setPeer(peer: Readonly<Peer> | undefined) {
    if (arePeersSame(peer, this.#currentPeer)) {
      return;
    }

    this.#currentPeer = peer;

    if (this.#session) {
      this.#sessionSubscriptions.forEach((subscription) => subscription.unsubscribe());
    }

    if (peer) {
      this.#session = makeSearchSession(peer);
      this.#sessionSubscriptions = [
        this.#session.isSearching.subscribe(this.isSearching),
        this.#session.isLoadingMore.subscribe(this.isLoadingMore),
        this.#session.result.subscribe(this.result),
      ];
    } else {
      this.#session = undefined;
      this.#sessionSubscriptions = [];
      this.isSearching.next(false);
      this.isLoadingMore.next(false);
      this.result.next(emptySearchResult);
    }
  }

  public search(request: SearchRequest) {
    if (!this.#session) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('Can\'t search because a peer is not set.');
      }
      return;
    }

    this.#session.search(request);
  }

  public loadMore() {
    if (!this.#session) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('Can\'t load more search results because a peer is not set.');
      }
      return;
    }

    this.#session.loadMore();
  }
}
