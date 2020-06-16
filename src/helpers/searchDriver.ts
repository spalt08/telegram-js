import { BehaviorSubject, Subject } from 'rxjs';

interface SearchResponse<TResult> {
  result: TResult;
  isEnd: boolean;
}

interface Options<TRequest, TResult> {
  isRequestEmpty(request: TRequest): boolean;
  areRequestEqual(request1: TRequest, request2: TRequest): boolean;
  /** When called with pageAfter, must load the next page of the result, merge it with the given result and return it */
  performSearch(request: TRequest, pageAfter?: TResult): Promise<SearchResponse<TResult>>;
}

export default class SearchDriver<TRequest extends Exclude<unknown, undefined>, TResult> {
  readonly result = new Subject<[TRequest, TResult | undefined, boolean]>();
  readonly isSearching = new BehaviorSubject(false);
  readonly isLoadingMore = new BehaviorSubject(false);

  #isRequestEmpty: (request: TRequest) => boolean;
  #areRequestEqual: (request1: TRequest, request2: TRequest) => boolean;
  #performSearch: (request: TRequest, pageAfter?: TResult) => Promise<SearchResponse<TResult>>;

  #latestRequest?: TRequest;

  #isReallySearching = false;

  #latestResult?: { request: TRequest, result: TResult, isFull: boolean };

  constructor({
    isRequestEmpty,
    areRequestEqual,
    performSearch,
  }: Options<TRequest, TResult>) {
    this.#isRequestEmpty = isRequestEmpty;
    this.#areRequestEqual = areRequestEqual;
    this.#performSearch = performSearch;
  }

  search(request: TRequest) {
    if (this.#latestRequest !== undefined && this.#areRequestEqual(this.#latestRequest, request)) {
      return;
    }

    this.#latestRequest = request;
    this.#doSearch();
  }

  loadMore() {
    this.#doLoadMore();
  }

  #doSearch = async () => {
    if (this.#latestRequest === undefined) {
      return;
    }

    if (this.#isRequestEmpty(this.#latestRequest)) {
      this.#setSearchResult(this.#latestRequest, undefined, true);
      this.#setIsSearching(false);
      this.#setIsLoadingMore(false);
      return;
    }

    this.#setIsSearching(true);

    // The request will be performed when the current request ends
    if (this.#isReallySearching) {
      return;
    }

    try {
      this.#isReallySearching = true;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const request = this.#latestRequest;
        let response: SearchResponse<TResult>;
        try {
          // eslint-disable-next-line no-await-in-loop
          response = await this.#performSearch(request);
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Failed to perform search', error);
          }
          return;
        }

        // Is the search result actual?
        if (this.#latestRequest === undefined || this.#isRequestEmpty(this.#latestRequest)) {
          break;
        }
        if (this.#areRequestEqual(request, this.#latestRequest)) {
          this.#setSearchResult(request, response.result, response.isEnd);
          this.#setIsLoadingMore(false);
          break;
        }
      }
    } finally {
      this.#isReallySearching = false;
      this.#setIsSearching(false);
    }
  };

  #doLoadMore = async () => {
    if (
      !this.#latestResult
      || this.isSearching.value // If the search process has started, it'll always lead to replacing the results list, so loading more is meaningless
      || this.isLoadingMore.value
    ) {
      return;
    }

    const { request: startRequest, result: previousResult, isFull: wasFull } = this.#latestResult;

    if (
      wasFull
      || this.isSearching.value // If the search process has started, it'll always lead to replacing the results list, so loading more is meaningless
      || this.isLoadingMore.value
    ) {
      return;
    }

    this.#setIsLoadingMore(true);

    let response: SearchResponse<TResult>;
    try {
      response = await this.#performSearch(startRequest, previousResult);
    } catch (error) {
      this.#setIsLoadingMore(false);
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to perform load more search results', error);
      }
      return;
    }

    if (!this.#latestResult || !this.#areRequestEqual(this.#latestResult.request, startRequest)) {
      return;
    }

    this.#setSearchResult(startRequest, response.result, response.isEnd);
    this.#setIsLoadingMore(false);
  };

  #setIsSearching = (isSearching: boolean) => {
    if (this.isSearching.value !== isSearching) {
      this.isSearching.next(isSearching);
    }
  };

  #setIsLoadingMore = (isLoadingMore: boolean) => {
    if (this.isLoadingMore.value !== isLoadingMore) {
      this.isLoadingMore.next(isLoadingMore);
    }
  };

  #setSearchResult = (request: TRequest, result: TResult | undefined, isFull: boolean) => {
    this.#latestResult = result === undefined ? undefined : { request, result, isFull };
    this.result.next([request, result, isFull]);
  };
}
