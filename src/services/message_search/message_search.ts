import { BehaviorSubject, Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import makeSearchSession, {
  SearchSession,
  SearchResult,
  SearchRequest,
  emptySearchResult,
} from './message_search_session';
import MessagesService from '../message';
import { Peer } from '../../cache/types';

export default class MessageSearchService {
  public readonly result = new BehaviorSubject<SearchResult>(emptySearchResult);

  public readonly isSearching = new BehaviorSubject(false);

  public readonly isLoadingMore = new BehaviorSubject(false);

  protected session?: SearchSession;

  protected sessionSubscriptions: Subscription[] = [];

  constructor(messageService: MessagesService) {
    // todo: Make a centralized source of truth of the current peer
    messageService.activePeer
      .pipe(distinctUntilChanged())
      .subscribe(this.handlePeerChange);
  }

  public search(request: SearchRequest) {
    if (!this.session) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('Can\'t search because a peer is not selected.');
      }
      return;
    }

    this.session.search(request);
  }

  public loadMore() {
    if (!this.session) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('Can\'t load more search results because a peer is not selected.');
      }
      return;
    }

    this.session.loadMore();
  }

  protected handlePeerChange = (peer: Peer | null) => {
    if (this.session) {
      this.session.destroy();
      this.sessionSubscriptions.forEach((subscription) => subscription.unsubscribe());
    }

    if (peer) {
      this.session = makeSearchSession(peer);
      this.sessionSubscriptions = [
        this.session.isSearching.subscribe(this.isSearching),
        this.session.isLoadingMore.subscribe(this.isLoadingMore),
        this.session.result.subscribe(this.result),
      ];
    } else {
      this.session = undefined;
      this.sessionSubscriptions = [];
      this.isSearching.next(false);
      this.isLoadingMore.next(false);
      this.result.next(emptySearchResult);
    }
  };
}
