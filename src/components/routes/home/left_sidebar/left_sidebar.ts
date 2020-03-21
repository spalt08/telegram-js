import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { div } from 'core/html';
import { getInterface } from 'core/hooks';
import { mount, unmount } from 'core/dom';
import { roundButton, searchInput } from 'components/ui';
import * as icons from 'components/icons';
import dialogs from './dialogs';
import searchResult from './search_result';
import './left_sidebar.scss';

interface Props {
  className?: string;
}

// If you want to add another screen to the left sidebar, please leave the search be the part of the first screen (dialogs list)

export default function leftSidebar({ className = '' }: Props = {}) {
  // Subscribing to these observables directly is ok because they're created in this scope
  // therefore subscribing doesn't create an external reference to this component
  const isSearchFocused = new BehaviorSubject(false);
  const isSearchFilled = new BehaviorSubject(false);
  const isSearchActive = new BehaviorSubject(false);

  combineLatest([isSearchFocused, isSearchFilled])
    .pipe(
      map(([isFocused, isFilled]) => isFocused || isFilled),
      distinctUntilChanged(),
    )
    .subscribe(isSearchActive);

  const searchInputEl = searchInput({
    placeholder: 'Search',
    className: 'leftSidebar__head_search',
    onFocus() {
      isSearchFocused.next(true);
    },
    onBlur() {
      isSearchFocused.next(false);
    },
    onChange(value) {
      isSearchFilled.next(!!value);
    },
  });

  const dialogsLayer = dialogs({ className: 'leftSidebar__layer' });
  let searchResultLayer: HTMLElement | undefined;

  const handleButtonClick = () => {
    if (isSearchActive.value) {
      getInterface(searchInputEl).blur();
      getInterface(searchInputEl).value = '';
      isSearchFilled.next(false); // Not called automatically by the input
    } else {
      // This is a mock of opening the menu
    }
  };

  const handleSearchResultTransitionEnd = () => {
    if (searchResultLayer && !isSearchActive.value) {
      unmount(searchResultLayer);
      searchResultLayer = undefined;
    }
  };

  isSearchActive.subscribe((isActive) => {
    if (isActive) {
      dialogsLayer.classList.add('-down');
      if (searchResultLayer) {
        searchResultLayer.classList.remove('-up');
      } else {
        // Create the element on open and destroy on close to reduce the initial render time and save memory
        searchResultLayer = searchResult({
          className: 'leftSidebar__layer -appearFromUp',
          onTransitionEnd: handleSearchResultTransitionEnd,
        });
        mount(dialogsLayer.parentNode!, searchResultLayer);
      }
    } else {
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
          { className: 'leftSidebar__head_button', onClick: handleButtonClick },
          icons.menuAndBack({ state: isSearchActive.pipe(map((isActive) => isActive ? 'back' : 'menu')) }),
        ),
        searchInputEl,
      ),
      div`.leftSidebar__body`(dialogsLayer),
    )
  );
}
