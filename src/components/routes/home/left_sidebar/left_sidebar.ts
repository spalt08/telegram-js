import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { div } from 'core/html';
import { getInterface } from 'core/hooks';
import { animationFrameStart, mount, unmount } from 'core/dom';
import { roundButton, searchInput } from 'components/ui';
import * as icons from 'components/icons';
import { globalSearch } from 'services';
import dialogs from './dialogs';
import globalSearchResult from './global_search_result';
import './left_sidebar.scss';

interface Props {
  className?: string;
}

// If you want to add another screen to the left sidebar, please leave the search be the part of the first screen (dialogs list)

export default function leftSidebar({ className = '' }: Props = {}) {
  // Subscribing to this observable directly is ok because they're created in this scope
  // therefore subscribing doesn't create an external reference to this component
  const isSearchActive = new BehaviorSubject(false);

  const searchInputEl = searchInput({
    placeholder: 'Search',
    className: 'leftSidebar__head_search',
    isLoading: combineLatest([globalSearch.isSearching, isSearchActive]).pipe(map(([isSearching, isActive]) => isSearching && isActive)),
    onFocus(value) {
      globalSearch.search(value);
      isSearchActive.next(true);
    },
    onChange(value) {
      globalSearch.search(value);
    },
  });

  const dialogsLayer = dialogs({ className: 'leftSidebar__layer' });
  let searchResultLayer: HTMLElement | undefined;

  const handleButtonClick = () => {
    if (isSearchActive.value) {
      isSearchActive.next(false);
    } else {
      // This is a mock of opening the menu
      // eslint-disable-next-line no-console
      console.log('Opening the menu...');
    }
  };

  const handleSearchResultTransitionEnd = async () => {
    await animationFrameStart();
    if (searchResultLayer && !isSearchActive.value) {
      unmount(searchResultLayer);
      searchResultLayer = undefined;
    }
  };

  isSearchActive.pipe(distinctUntilChanged()).subscribe(async (isActive) => {
    await animationFrameStart();
    if (isActive) {
      dialogsLayer.classList.add('-down');
      if (searchResultLayer) {
        searchResultLayer.classList.remove('-up');
      } else {
        // Create the element on open and destroy on close to reduce the initial render time and save memory
        searchResultLayer = globalSearchResult({
          className: 'leftSidebar__layer -appearFromUp',
          onTransitionEnd: handleSearchResultTransitionEnd,
          onAnimationEnd: handleSearchResultTransitionEnd,
          onExit() {
            isSearchActive.next(false);
          },
        });
        mount(dialogsLayer.parentNode!, searchResultLayer);
      }
    } else {
      getInterface(searchInputEl).blur();
      getInterface(searchInputEl).value = '';
      dialogsLayer.classList.remove('-down');
      if (searchResultLayer) {
        searchResultLayer.classList.add('-up');
      }
    }
  });

  return (
    div`.leftSidebar ${className}`(
      div`.leftSidebar__head`(
        roundButton(
          {
            className: 'leftSidebar__head_button',
            onClick: handleButtonClick,
          },
          icons.menuAndBack({ state: isSearchActive.pipe(map((isActive) => isActive ? 'back' : 'menu')) }),
        ),
        searchInputEl,
      ),
      div`.leftSidebar__body`(dialogsLayer),
    )
  );
}
